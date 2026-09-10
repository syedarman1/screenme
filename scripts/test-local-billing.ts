import assert from "node:assert/strict";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
async function main() {
  assert.equal(
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname,
    "127.0.0.1",
    "Isolated local database required",
  );
  assert.match(
    process.env.STRIPE_SECRET_KEY ?? "",
    /^[sr]k_test_/,
    "Stripe test key required",
  );
  assert.ok(process.env.STRIPE_WEBHOOK_SECRET);
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    timeout: 20000,
    maxNetworkRetries: 0,
  });
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  // Avoid sending test events to existing external integrations.
  assert.equal(
    (await stripe.webhookEndpoints.list({ limit: 1 })).data.length,
    0,
    "Use an isolated Stripe test account without external webhook destinations",
  );
  const created = await db.auth.admin.createUser({
    email: `billing-qa-${Date.now()}@example.invalid`,
    password: crypto.randomUUID(),
    email_confirm: true,
  });
  assert.equal(created.error, null);
  const uid = created.data.user!.id;
  let clock: Stripe.TestHelpers.TestClock | undefined;
  let subscription: Stripe.Subscription;
  const forwarded = new Map<string, Stripe.Event>();
  async function forward(type: string, duplicate = false) {
    for (let n = 0; n < 20; n++) {
      const list = await stripe.events.list({ type, limit: 50 });
      const event = duplicate
        ? forwarded.get(type)
        : list.data.find((e) => {
            if (e.id === forwarded.get(type)?.id) return false;
            const o = e.data.object as unknown as {
              id: string;
              parent?: { subscription_details?: { subscription?: string } };
            };
            const invoice =
              typeof subscription.latest_invoice === "string"
                ? subscription.latest_invoice
                : subscription.latest_invoice?.id;
            return (
              o.id === subscription.id ||
              (o.id === invoice &&
                o.parent?.subscription_details?.subscription ===
                  subscription.id)
            );
          });
      if (event) {
        const body = JSON.stringify(event);
        const signature = stripe.webhooks.generateTestHeaderString({
          payload: body,
          secret: process.env.STRIPE_WEBHOOK_SECRET!,
        });
        const response = await fetch(
          "http://localhost:3000/api/stripe/webhook",
          { method: "POST", headers: { "stripe-signature": signature }, body },
        );
        assert.equal(response.status, 200, await response.text());
        forwarded.set(type, event);
        return event.id;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Missing Stripe event: ${type}`);
  }
  async function plan(expected: string) {
    const { data, error } = await db
      .from("user_plans")
      .select("plan")
      .eq("user_id", uid)
      .single();
    assert.equal(error, null);
    assert.equal(data!.plan, expected);
  }
  async function advance(to: number) {
    await stripe.testHelpers.testClocks.advance(clock!.id, { frozen_time: to });
    for (let n = 0; n < 90; n++) {
      const state = await stripe.testHelpers.testClocks.retrieve(clock!.id);
      if (state.status === "ready") {
        clock = state;
        subscription = await stripe.subscriptions.retrieve(subscription.id);
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error("Test clock did not finish advancing");
  }
  try {
    clock = await stripe.testHelpers.testClocks.create({
      frozen_time: Math.floor(Date.now() / 1000),
      name: "ScreenMe local lifecycle QA",
    });
    const customer = await stripe.customers.create({
      test_clock: clock.id,
      name: "ScreenMe local automated QA",
    });
    const card = await stripe.paymentMethods.attach("pm_card_visa", {
      customer: customer.id,
    });
    subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price:
            process.env.STRIPE_PRICE_PRO ||
            process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO!,
        },
      ],
      default_payment_method: card.id,
      metadata: { userId: uid },
    });
    assert.equal(subscription.status, "active");
    const eventId = await forward("customer.subscription.created");
    await plan("pro");
    await forward("customer.subscription.created", true);
    const count = await db
      .from("billing_fulfillments")
      .select("key", { count: "exact", head: true })
      .eq("key", eventId);
    assert.equal(count.count, 1);
    console.log("PASS purchase activation and duplicate event");
    await advance(subscription.items.data[0].current_period_end + 7200);
    await forward("invoice.paid");
    await plan("pro");
    console.log("PASS paid renewal");
    const declined = await stripe.paymentMethods.attach(
      "pm_card_chargeCustomerFail",
      { customer: customer.id },
    );
    subscription = await stripe.subscriptions.update(subscription.id, {
      default_payment_method: declined.id,
    });
    await advance(subscription.items.data[0].current_period_end + 7200);
    assert.equal(subscription.status, "past_due");
    await forward("invoice.payment_failed");
    await plan("free");
    console.log("PASS failed renewal removes Pro");
    subscription = await stripe.subscriptions.update(subscription.id, {
      default_payment_method: card.id,
    });
    const invoice =
      typeof subscription.latest_invoice === "string"
        ? subscription.latest_invoice
        : subscription.latest_invoice!.id;
    await stripe.invoices.pay(invoice, { payment_method: card.id });
    await forward("invoice.paid");
    await plan("pro");
    console.log("PASS recovered payment restores Pro");
    subscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });
    await forward("customer.subscription.updated");
    await plan("pro");
    subscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
    });
    await forward("customer.subscription.updated");
    await plan("pro");
    console.log(
      "PASS scheduled cancellation and reversal retain current access",
    );
    subscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });
    await advance(subscription.items.data[0].current_period_end + 1);
    assert.equal(subscription.status, "canceled");
    await forward("customer.subscription.deleted");
    await plan("free");
    console.log("PASS cancellation at period end removes Pro");
    console.log(
      "Real Stripe test API; real events signed and forwarded locally. No real charge, no public delivery test.",
    );
  } finally {
    if (clock) await stripe.testHelpers.testClocks.del(clock.id);
    assert.equal((await db.auth.admin.deleteUser(uid)).error, null);
    console.log("Temporary billing customer, clock and local account removed.");
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Billing test failed");
  process.exitCode = 1;
});
