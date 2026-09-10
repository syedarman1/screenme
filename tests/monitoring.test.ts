import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import {
  aiMetrics,
  newMetrics,
  recordCompletion,
  recordUnpricedCall,
} from "../src/app/lib/aiMetrics";
const native = globalThis.fetch;
const uid = "00000000-0000-4000-8000-000000000001",
  id = "00000000-0000-4000-8000-000000000002";
let calls: { url: string; body: Record<string, unknown> }[] = [];
let owned = true;
let monitoring: typeof import("../src/app/api/monitoring/route"),
  feedback: typeof import("../src/app/api/feedback/route"),
  applications: typeof import("../src/app/api/application-workspaces/route");
before(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://metrics.supabase.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "synthetic";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic";
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input),
      body = JSON.parse(String(init?.body || "{}"));
    calls.push({ url, body });
    if (url.includes("/auth/v1/user")) return Response.json({ id: uid });
    if (url.includes("screenme_rate_limit"))
      return Response.json({ success: true });
    if (url.includes("screenme_start_application_work"))
      return Response.json(id);
    if (init?.method === "PATCH") return Response.json(owned ? [{ id }] : []);
    return Response.json([]);
  };
  monitoring = await import("../src/app/api/monitoring/route");
  feedback = await import("../src/app/api/feedback/route");
  applications = await import("../src/app/api/application-workspaces/route");
});
beforeEach(() => {
  calls = [];
  owned = true;
  delete process.env.SCREENME_OPERATOR_IDS;
});
after(() => {
  globalThis.fetch = native;
});
const req = (path: string, body?: unknown) =>
  new Request(`http://localhost${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer test",
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
test("metrics accumulate writer and verifier, mark audio unknown, and do not retain content", () => {
  const m = newMetrics();
  aiMetrics.run(m, () => {
    recordCompletion({
      model: "gpt-5.6-terra",
      usage: { prompt_tokens: 1000, completion_tokens: 100 },
    });
    recordCompletion({
      model: "gpt-5.6-terra",
      usage: { prompt_tokens: 2000, completion_tokens: 100 },
    });
    recordUnpricedCall("whisper-1");
  });
  assert.equal(m.calls, 3);
  assert.equal(m.input, 3000);
  assert.equal(m.output, 200);
  assert.ok(Math.abs(m.cost - 0.0084) < 0.000001);
  assert.equal(m.complete, false);
  assert.deepEqual(Object.keys(m).sort(), [
    "calls",
    "complete",
    "cost",
    "input",
    "models",
    "output",
  ]);
});
test("aggregate monitoring requires the server operator allowlist", async () => {
  assert.equal(
    (await monitoring.GET(req("/api/monitoring?scope=all"))).status,
    403,
  );
  assert.equal(calls.filter((c) => c.url.includes("/rpc/")).length, 0);
  process.env.SCREENME_OPERATOR_IDS = uid;
  assert.equal(
    (await monitoring.GET(req("/api/monitoring?scope=all"))).status,
    200,
  );
  assert.equal(calls.at(-1)?.body.p_user_id, null);
  delete process.env.SCREENME_OPERATOR_IDS;
  const r = await monitoring.GET(req("/api/monitoring"));
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(calls.at(-1)?.body.p_user_id, uid);
});
test("feedback cannot modify someone else’s run and rejects free text", async () => {
  owned = false;
  assert.equal(
    (await feedback.POST(req("/api/feedback", { id, helpful: true }))).status,
    404,
  );
  const url = new URL(calls.at(-1)!.url);
  assert.equal(url.searchParams.get("user_id"), `eq.${uid}`);
  assert.equal(url.searchParams.get("status"), "gte.200");
  assert.equal(
    (
      await feedback.POST(
        req("/api/feedback", { id, helpful: "Resume content" }),
      )
    ).status,
    400,
  );
});
test("starting application work uses verified owner and bounded resume", async () => {
  assert.equal(
    (
      await applications.POST(
        req("/api/application-workspaces", {
          applicationId: id,
          kind: "match",
          resume: "Source",
          user_id: "attacker",
        }),
      )
    ).status,
    201,
  );
  assert.equal(calls.at(-1)?.body.p_user_id, uid);
  assert.equal(
    (
      await applications.POST(
        req("/api/application-workspaces", {
          applicationId: id,
          kind: "match",
          resume: "x".repeat(50001),
        }),
      )
    ).status,
    400,
  );
});
