import Stripe from "stripe";
import { supabaseAdmin } from "./supabaseAdmin";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 20_000, maxNetworkRetries: 2 }) : null;

export function appUrl(): string {
  const url = new URL(process.env.NEXT_PUBLIC_URL || "http://localhost:3000");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("A secure application URL is required.");
  return url.origin;
}

export function proPriceId(): string {
  const id = process.env.STRIPE_PRICE_PRO || process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO;
  if (!id) throw new Error("Pro pricing is not configured.");
  return id;
}

export function stripeId(value: string | { id: string } | null | undefined): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

export function subscriptionIsPro(sub: Stripe.Subscription): boolean {
  return ["active", "trialing"].includes(sub.status) && sub.items.data.some(item => item.price.id === proPriceId());
}

export function validateCheckout(session: Stripe.Checkout.Session, userId: string): void {
  if (session.metadata?.userId !== userId) throw new Error("This payment belongs to a different account.");
  if (session.mode !== "subscription" || session.status !== "complete" || !["paid", "no_payment_required"].includes(session.payment_status)) throw new Error("Payment has not completed yet.");
  if (!session.line_items?.data.some(item => item.price?.id === proPriceId())) throw new Error("Unexpected checkout product.");
}

export async function syncSubscription(args: {
  userId: string; subscriptionId: string; key: string; amount?: number | null; currency?: string | null;
}): Promise<boolean> {
  if (!stripe || !supabaseAdmin) throw new Error("Billing is not configured.");
  // Read Stripe's current state even for delayed or out-of-order deliveries.
  const observedAt = new Date().toISOString();
  const sub = await stripe.subscriptions.retrieve(args.subscriptionId);
  const customerId = stripeId(sub.customer);
  if (!customerId) throw new Error("Subscription customer is missing.");
  const pro = subscriptionIsPro(sub);
  const status = !pro && ["active", "trialing"].includes(sub.status) ? "canceled" : sub.status;
  const { error } = await supabaseAdmin.rpc("screenme_apply_billing", {
    p_key: args.key, p_user_id: args.userId, p_subscription_id: sub.id,
    p_customer_id: customerId, p_status: status, p_observed_at: observedAt,
    p_amount: args.amount ?? null, p_currency: args.currency ?? null,
  });
  if (error) throw new Error("Could not save billing status. Please retry.");
  return pro;
}

export async function fulfillCheckout(sessionId: string, userId: string): Promise<boolean> {
  if (!stripe) throw new Error("Billing is not configured.");
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
  validateCheckout(session, userId);
  const subscriptionId = stripeId(session.subscription);
  if (!subscriptionId) throw new Error("Subscription is missing.");
  // Verification reconciles current state; webhook deduplication uses event IDs.
  return syncSubscription({ userId, subscriptionId, key: `verify:${session.id}:${crypto.randomUUID()}` });
}
