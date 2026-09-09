import { test } from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import { validateCheckout, subscriptionIsPro, matchesOnsiteCheckout, publishableKey } from "../src/app/lib/billing";

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

test("on-site checkout reuse isolates customer, price, surface, and return origin", () => {
  const onsite = { ...session, metadata: {userId: "owner", priceId: "price_expected"}, ui_mode: "elements", return_url: "https://www.screenme.dev/success?session_id={CHECKOUT_SESSION_ID}" } as Stripe.Checkout.Session;
  assert.equal(matchesOnsiteCheckout(onsite, "owner", "price_expected", "https://www.screenme.dev"), true);
  assert.equal(matchesOnsiteCheckout(onsite, "other", "price_expected", "https://www.screenme.dev"), false);
  assert.equal(matchesOnsiteCheckout(onsite, "owner", "other_price", "https://www.screenme.dev"), false);
  assert.equal(matchesOnsiteCheckout({...onsite, ui_mode: "hosted_page"}, "owner", "price_expected", "https://www.screenme.dev"), false);
  assert.equal(matchesOnsiteCheckout(onsite, "owner", "price_expected", "https://preview.example.com"), false);
});

test("browser payment keys must match the server's Stripe mode", () => {
  const secret = process.env.STRIPE_SECRET_KEY, publicKey = process.env.STRIPE_PUBLISHABLE_KEY;
  try {
    process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
    process.env.STRIPE_PUBLISHABLE_KEY = "pk_live_fixture";
    assert.throws(() => publishableKey());
    process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_fixture";
    assert.equal(publishableKey(), "pk_test_fixture");
    process.env.STRIPE_SECRET_KEY = "rk_live_fixture";
    assert.throws(() => publishableKey());
  } finally {
    if (secret === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = secret;
    if (publicKey === undefined) delete process.env.STRIPE_PUBLISHABLE_KEY; else process.env.STRIPE_PUBLISHABLE_KEY = publicKey;
  }
});
