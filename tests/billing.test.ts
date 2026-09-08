import { test } from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import { validateCheckout, subscriptionIsPro } from "../src/app/lib/billing";

process.env.STRIPE_PRICE_PRO = "price_expected";
const session = {
  metadata: { userId: "owner" }, mode: "subscription", status: "complete", payment_status: "paid",
  line_items: { data: [{ price: { id: "price_expected" } }] },
} as unknown as Stripe.Checkout.Session;

test("checkout requires the paid product and verified owner", () => {
  assert.doesNotThrow(() => validateCheckout(session, "owner"));
  assert.throws(() => validateCheckout(session, "other"));
  assert.throws(() => validateCheckout({ ...session, payment_status: "unpaid" }, "owner"));
  assert.throws(() => validateCheckout({ ...session, line_items: undefined }, "owner"));
});

test("an old paid session does not confer an active subscription", () => {
  const sub = { status: "active", items: { data: [{ price: { id: "price_expected" } }] } } as unknown as Stripe.Subscription;
  assert.equal(subscriptionIsPro(sub), true);
  assert.equal(subscriptionIsPro({ ...sub, status: "canceled" }), false);
  assert.equal(subscriptionIsPro({ ...sub, status: "unpaid" }), false);
});
