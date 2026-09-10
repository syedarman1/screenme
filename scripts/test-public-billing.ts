import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
// Explicit integration check: temporary public tunnel, local database, Stripe test mode only.
// Prepare the endpoint/environment first; this script never changes production settings.
async function main() {
  assert.equal(
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname,
    "127.0.0.1",
  );
  assert.match(process.env.STRIPE_SECRET_KEY!, /^[sr]k_test_/);
  const state = JSON.parse(
    readFileSync(
      process.env.SCREENME_QA_STATE || "../launch-qa/state.json",
      "utf8",
    ),
  );
  assert.match(state.origin, /^https:\/\/[a-z-]+\.trycloudflare\.com$/);
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    timeout: 20000,
    maxNetworkRetries: 0,
  });
  const hooks = (await stripe.webhookEndpoints.list({ limit: 100 })).data;
  assert.equal(hooks.length, 1);
  assert.equal(hooks[0].id, state.webhookId);
  assert.equal(hooks[0].url, state.origin + "/api/stripe/webhook");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const created = await db.auth.admin.createUser({
    email: `lifecycle-${Date.now()}@example.invalid`,
    email_confirm: true,
  });
  assert.equal(created.error, null);
  const uid = created.data.user!.id;
  let clock: Stripe.TestHelpers.TestClock | undefined;
  let sub: Stripe.Subscription;
  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  async function receipt(type: string, expected: string, since: number) {
    for (let i = 0; i < 60; i++) {
      const events = await stripe.events.list({
        type,
        limit: 100,
        created: { gte: since },
      });
      const event = events.data.find((e) => {
        const object = e.data.object as unknown as {
          id: string;
          parent?: {
            subscription_details?: { subscription?: string | { id: string } };
          };
        };
        const subscription = object.parent?.subscription_details?.subscription;
        return (
          object.id === sub.id ||
          (typeof subscription === "string"
            ? subscription
            : subscription?.id) === sub.id
        );
      });
      if (event) {
        const receipt = await db
          .from("billing_fulfillments")
          .select("key")
          .eq("key", event.id)
          .maybeSingle();
        if (receipt.data) {
          const plan = await db
            .from("user_plans")
            .select("plan")
            .eq("user_id", uid)
            .single();
          if (plan.data?.plan === expected) {
            console.log(`PASS public Stripe delivery: ${type} → ${expected}`);
            return event;
          }
        }
      }
      await wait(1000);
    }
    throw new Error(`No durable public receipt/plan for ${type} → ${expected}`);
  }
  async function advance(to: number) {
    await stripe.testHelpers.testClocks.advance(clock!.id, { frozen_time: to });
    for (let i = 0; i < 90; i++) {
      const current = await stripe.testHelpers.testClocks.retrieve(clock!.id);
      if (current.status === "ready") {
        clock = current;
        sub = await stripe.subscriptions.retrieve(sub.id);
        return;
      }
      await wait(1000);
    }
    throw new Error("Test clock did not finish");
  }
  try {
    clock = await stripe.testHelpers.testClocks.create({
      frozen_time: Math.floor(Date.now() / 1000),
      name: "ScreenMe public webhook launch QA",
    });
    const customer = await stripe.customers.create({
      test_clock: clock.id,
      metadata: { userId: uid },
    });
    const good = await stripe.paymentMethods.attach("pm_card_visa", {
      customer: customer.id,
    });
    let since = Math.floor(Date.now() / 1000);
    sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price:
            process.env.STRIPE_PRICE_PRO ||
            process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO!,
        },
      ],
      default_payment_method: good.id,
      metadata: { userId: uid },
    });
    assert.equal(sub.status, "active");
    const first = await receipt("customer.subscription.created", "pro", since);
    // Explicit duplicate replay after genuine delivery; still signed, but not represented as Stripe-origin delivery.
    const body = JSON.stringify(first),
      signature = stripe.webhooks.generateTestHeaderString({
        payload: body,
        secret: process.env.STRIPE_WEBHOOK_SECRET!,
      });
    assert.equal(
      (
        await fetch(state.origin + "/api/stripe/webhook", {
          method: "POST",
          headers: { "stripe-signature": signature },
          body,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await db
          .from("billing_fulfillments")
          .select("key", { count: "exact", head: true })
          .eq("key", first.id)
      ).count,
      1,
    );
    console.log("PASS duplicate replay has one receipt");
    since = Math.floor(Date.now() / 1000);
    await advance(sub.items.data[0].current_period_end + 7200);
    await receipt("invoice.paid", "pro", since);
    const bad = await stripe.paymentMethods.attach(
      "pm_card_chargeCustomerFail",
      { customer: customer.id },
    );
    sub = await stripe.subscriptions.update(sub.id, {
      default_payment_method: bad.id,
    });
    since = Math.floor(Date.now() / 1000);
    await advance(sub.items.data[0].current_period_end + 7200);
    assert.equal(sub.status, "past_due");
    await receipt("invoice.payment_failed", "free", since);
    sub = await stripe.subscriptions.update(sub.id, {
      default_payment_method: good.id,
    });
    const invoice =
      typeof sub.latest_invoice === "string"
        ? sub.latest_invoice
        : sub.latest_invoice!.id;
    since = Math.floor(Date.now() / 1000);
    await stripe.invoices.pay(invoice, { payment_method: good.id });
    await receipt("invoice.paid", "pro", since);
    since = Math.floor(Date.now() / 1000);
    sub = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });
    await receipt("customer.subscription.updated", "pro", since);
    sub = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: false,
    });
    await receipt("customer.subscription.updated", "pro", since);
    console.log("PASS cancellation reversal");
    sub = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });
    since = Math.floor(Date.now() / 1000);
    await advance(sub.items.data[0].current_period_end + 1);
    await receipt("customer.subscription.deleted", "free", since);
    console.log(
      "PASS public subscription lifecycle. Real Stripe test events; no live charge.",
    );
  } finally {
    if (clock) await stripe.testHelpers.testClocks.del(clock.id);
    await db.auth.admin.deleteUser(uid);
    console.log(
      "Removed lifecycle test clock, customer, subscription and local account.",
    );
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
