import { rateLimit } from "../../lib/rate-limit";
import { boundedRequest } from "../../lib/aiRequest";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorized } from "../../lib/auth";
import { supabaseAdmin as db } from "../../lib/supabaseAdmin";
import { stripe, appUrl, proPriceId, fulfillCheckout } from "../../lib/billing";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (!stripe || !db) return NextResponse.json({ error: "Billing is unavailable." }, { status: 503 });
  try {
    const rate = await rateLimit(`billing:${user.id}`);
    if (!rate.success) return NextResponse.json({ error: "Please wait before trying billing again." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
    const body = await (await boundedRequest(req, 4096)).json().catch(() => ({}));
    if (body.action === "verify") {
      if (typeof body.sessionId !== "string" || !body.sessionId.startsWith("cs_")) return NextResponse.json({ error: "Invalid checkout session." }, { status: 400 });
      const active = await fulfillCheckout(body.sessionId, user.id);
      return NextResponse.json({ success: active, planUpdated: active, message: active ? "Your Pro plan is ready." : "This subscription is no longer active." });
    }
    const priceId = proPriceId();
    if (body.priceId && body.priceId !== priceId) return NextResponse.json({ error: "Invalid price." }, { status: 400 });
    const { data: plan, error } = await db.from("user_plans").select("stripe_customer_id,stripe_subscription_id").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    let customerId = plan?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } }, { idempotencyKey: `screenme-customer:${user.id}` });
      customerId = customer.id;
      const { error: saveError } = await db.from("user_plans").upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
      if (saveError) throw saveError;
    }
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    if (subscriptions.data.some(sub => !["canceled", "incomplete_expired"].includes(sub.status))) {
      const portal = await stripe.billingPortal.sessions.create({ configuration: process.env.STRIPE_PORTAL_CONFIGURATION || undefined, customer: customerId, return_url: `${appUrl()}/dashboard` });
      return NextResponse.json({ url: portal.url });
    }
    const recent = await stripe.checkout.sessions.list({ customer: customerId, limit: 100 });
    const matching = recent.data.filter(session => session.metadata?.userId === user.id && session.metadata?.priceId === priceId);
    const existing = matching.find(session => session.status === "open");
    if (existing?.url) return NextResponse.json({ url: existing.url });
    // Use the previous finished attempt, not a clock bucket, so simultaneous
    // checkout requests share one Stripe idempotency key across time boundaries.
    const previousAttempt = matching.find(session => session.status !== "open")?.id || "initial";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/dashboard`,
      metadata: { userId: user.id, priceId }, subscription_data: { metadata: { userId: user.id } },
      integration_identifier: "screenme_reliability_kvzhptnx",
    }, { idempotencyKey: `screenme-checkout:${user.id}:${priceId}:${previousAttempt}` });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Billing request failed", error instanceof Error ? error.name : "DatabaseError");
    return NextResponse.json({ success: false, error: "Billing could not be completed. Please retry or contact support." }, { status: 503 });
  }
}
