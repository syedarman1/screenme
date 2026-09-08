import { test, before, beforeEach, after, mock } from "node:test";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";

let contact: typeof import("../src/app/api/contact/route");
let webhook: typeof import("../src/app/api/stripe/webhook/route");
let billing: typeof import("../src/app/lib/billing");
let usage: typeof import("../src/app/lib/aiRequest");
let storageFails = false;
let authenticated = true;
let rpcCalls: { name: string; body: Record<string, unknown> }[] = [];
const originalFetch = globalThis.fetch;
const userId = "00000000-0000-4000-8000-000000000001";
const request = (path: string, body: unknown) => new NextRequest(`https://screenme.example${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer synthetic-token" }, body: JSON.stringify(body) });

before(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://synthetic.supabase.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "synthetic-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service-key";
  process.env.STRIPE_SECRET_KEY = "sk_test_synthetic_not_a_real_key";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_synthetic";
  process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO = "price_pro";
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    assert.ok(url.startsWith("https://synthetic.supabase.invalid/"), `Unexpected network request: ${url}`);
    if (url.includes("/auth/v1/user")) return Response.json(authenticated ? { id: userId, email: "test@example.invalid" } : { message: "Unauthorized" }, { status: authenticated ? 200 : 401 });
    const name = new URL(url).pathname.split("/").at(-1)!;
    if (url.includes("/rpc/")) {
      const body = JSON.parse(String(init?.body || "{}"));
      rpcCalls.push({ name, body });
      if (name === "screenme_rate_limit") return Response.json({ success: true, limit: 10, remaining: 9, retryAfter: 60 });
      if (name === "screenme_usage") return Response.json({ allowed: true, plan: "free", remaining: 2, limit: 3, reservationId: "00000000-0000-4000-8000-000000000002" });
      if (name === "screenme_finish_usage") return Response.json(true);
      if (name === "screenme_apply_billing") return Response.json(storageFails ? { message: "Injected database failure" } : true, { status: storageFails ? 500 : 200 });
    }
    if (name === "contact_messages") return Response.json(storageFails ? { message: "Injected database failure" } : { id: "synthetic-message" }, { status: storageFails ? 500 : 201 });
    if (name === "user_plans") return Response.json({ user_id: userId });
    throw new Error(`Unexpected request ${url}`);
  };
  contact = await import("../src/app/api/contact/route");
  webhook = await import("../src/app/api/stripe/webhook/route");
  billing = await import("../src/app/lib/billing");
  usage = await import("../src/app/lib/aiRequest");
});
beforeEach(() => { storageFails = false; authenticated = true; rpcCalls = []; mock.restoreAll(); });
after(() => { globalThis.fetch = originalFetch; mock.restoreAll(); });

test("contact confirms success only after durable storage succeeds", async () => {
  const message = { name: "Test User", email: "test@example.invalid", subject: "Support", message: "Synthetic test message" };
  storageFails = true;
  assert.equal((await contact.POST(request("/api/contact", message))).status, 503);
  storageFails = false;
  const response = await contact.POST(request("/api/contact", message));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).reference, "synthetic-message");
});

test("contact rejects malformed and oversized submissions", async () => {
  assert.equal((await contact.POST(request("/api/contact", {}))).status, 400);
  assert.equal((await contact.POST(request("/api/contact", { message: "a".repeat(13_000) }))).status, 413);
});

test("AI request failures refund the reservation; successful requests settle it", async () => {
  const failure = await usage.withUsage(request("/api/test", {}), "resume_scan", async () => NextResponse.json({ error: "Injected AI failure" }, { status: 502 }));
  assert.equal(failure.status, 502);
  assert.equal(rpcCalls.at(-1)?.body.p_success, false);
  const success = await usage.withUsage(request("/api/test", {}), "resume_scan", async () => NextResponse.json({ result: "Synthetic output" }));
  assert.equal(success.status, 200);
  assert.equal(rpcCalls.at(-1)?.body.p_success, true);
});

test("signed-out requests cannot reach AI or usage reservation", async () => {
  authenticated = false;
  const response = await usage.withUsage(request("/api/test", {}), "resume_scan", async () => { throw new Error("Must not run"); });
  assert.equal(response.status, 401);
  assert.equal(rpcCalls.length, 0);
});

function signedEvent() {
  const payload = JSON.stringify({ id: "evt_retry_synthetic", type: "customer.subscription.updated", created: Math.floor(Date.now()/1000) - 7*86400, data: { object: { id: "sub_synthetic" } } });
  const signature = billing.stripe!.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
  return new NextRequest("https://screenme.example/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": signature } });
}

test("Stripe webhook rejects bad signatures and retries an old event after storage failure", async () => {
  assert.equal((await webhook.POST(request("/api/stripe/webhook", {}))).status, 400);
  mock.method(billing.stripe!.subscriptions, "retrieve", async () => ({ id: "sub_synthetic", customer: "cus_synthetic", status: "active", metadata: { userId }, items: { data: [{ price: { id: "price_pro" } }] } }));
  storageFails = true;
  assert.equal((await webhook.POST(signedEvent())).status, 503);
  storageFails = false;
  assert.equal((await webhook.POST(signedEvent())).status, 200);
  assert.equal(rpcCalls.filter(call => call.name === "screenme_apply_billing").length, 2);
});
