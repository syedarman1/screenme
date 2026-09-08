import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, stripeId, syncSubscription, validateCheckout } from "../../../lib/billing";
import { supabaseAdmin as db } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  if (!stripe || !db || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Billing unavailable." }, { status: 503 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") || "", process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }
  try {
    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
      const payload = event.data.object as Stripe.Checkout.Session;
      if (payload.metadata?.userId && payload.mode === "subscription") {
        if (!["paid", "no_payment_required"].includes(payload.payment_status)) return NextResponse.json({ received: true });
        const session = await stripe.checkout.sessions.retrieve(payload.id, { expand: ["line_items"] });
        validateCheckout(session, payload.metadata.userId);
        const subscriptionId = stripeId(session.subscription);
        if (!subscriptionId) throw new Error("Missing subscription");
        await syncSubscription({ userId: payload.metadata.userId, subscriptionId, key: event.id, amount: session.amount_total, currency: session.currency });
      }
    } else if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "invoice.paid", "invoice.payment_succeeded", "invoice.payment_failed"].includes(event.type)) {
      const payload = event.data.object;
      const subscriptionId = event.type.startsWith("customer.subscription.")
        ? (payload as Stripe.Subscription).id
        : stripeId((payload as Stripe.Invoice).parent?.subscription_details?.subscription)
          || stripeId((payload as unknown as { subscription?: string }).subscription);
      if (subscriptionId) {
        const { data: plan, error } = await db.from("user_plans").select("user_id").eq("stripe_subscription_id", subscriptionId).maybeSingle();
        if (error) throw error;
        if (plan) await syncSubscription({ userId: plan.user_id, subscriptionId, key: event.id });
        else {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          if (sub.metadata.userId) await syncSubscription({ userId: sub.metadata.userId, subscriptionId, key: event.id });
          else return NextResponse.json({ error: "Checkout fulfillment is pending." }, { status: 503 });
        }
      }
    }
    return NextResponse.json({ received: true });
  } catch {
    console.error("Stripe fulfillment failed", { eventId: event.id, type: event.type });
    return NextResponse.json({ error: "Fulfillment temporarily unavailable. Retry this event." }, { status: 503 });
  }
}
