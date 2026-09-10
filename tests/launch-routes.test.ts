import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
const uid = "00000000-0000-4000-8000-000000000001",
  id = "00000000-0000-4000-8000-000000000002";
const originalFetch = globalThis.fetch;
let authenticated = true,
  found = true,
  calls: { url: URL; method: string; body: unknown }[] = [];
let resumes: typeof import("../src/app/api/resumes/route"),
  support: typeof import("../src/app/api/support/route");
before(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://launch.supabase.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "synthetic-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service";
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    assert.equal(url.origin, "https://launch.supabase.invalid");
    if (url.pathname.includes("/auth/v1/user"))
      return Response.json(
        authenticated ? { id: uid } : { message: "Unauthorized" },
        { status: authenticated ? 200 : 401 },
      );
    const method = init?.method || "GET",
      body = JSON.parse(String(init?.body || "null"));
    calls.push({ url, method, body });
    if (url.pathname.endsWith("resume_versions"))
      return Response.json(
        found
          ? { id, name: "My resume", content: "Owner-only resume text" }
          : null,
      );
    if (url.pathname.endsWith("contact_messages"))
      return Response.json(
        method === "PATCH"
          ? found
            ? { id, status: "handled" }
            : null
          : [{ id, message: "Private support request" }],
        { headers: { "content-range": "0-0/1" } },
      );
    throw new Error("Unexpected request");
  };
  resumes = await import("../src/app/api/resumes/route");
  support = await import("../src/app/api/support/route");
});
beforeEach(() => {
  authenticated = true;
  found = true;
  calls = [];
  process.env.SCREENME_OPERATOR_IDS = "";
});
after(() => {
  globalThis.fetch = originalFetch;
});
function req(path: string, method = "GET", body?: unknown) {
  return new NextRequest(`https://screenme.example${path}`, {
    method,
    headers: { Authorization: "Bearer synthetic" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
test("saved resume reads include content only for the verified owner and never cache it", async () => {
  const response = await resumes.GET(req(`/api/resumes?id=${id}`));
  assert.equal(response.status, 200);
  assert.equal(
    (await response.json()).resume.content,
    "Owner-only resume text",
  );
  assert.equal(calls.at(-1)?.url.searchParams.get("user_id"), `eq.${uid}`);
  assert.equal(calls.at(-1)?.url.searchParams.get("id"), `eq.${id}`);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  found = false;
  assert.equal((await resumes.GET(req(`/api/resumes?id=${id}`))).status, 404);
  assert.equal(
    (
      await resumes.PATCH(
        req("/api/resumes", "PATCH", { id, name: "New name" }),
      )
    ).status,
    404,
  );
});
test("saved resume endpoints reject unauthenticated, malformed and oversized writes", async () => {
  authenticated = false;
  assert.equal((await resumes.GET(req(`/api/resumes?id=${id}`))).status, 401);
  assert.equal(calls.length, 0);
  authenticated = true;
  assert.equal((await resumes.GET(req("/api/resumes?id=broken"))).status, 400);
  for (const body of [
    { id, name: " " },
    { id, content: "tiny" },
    { id: "bad", name: "Resume" },
  ])
    assert.equal(
      (await resumes.PATCH(req("/api/resumes", "PATCH", body))).status,
      400,
    );
  assert.equal(
    (
      await resumes.POST(
        req("/api/resumes", "POST", { content: "a".repeat(125001) }),
      )
    ).status,
    413,
  );
  assert.equal(calls.length, 0);
});
test("support denies non-operators before reading customer messages", async () => {
  authenticated = false;
  assert.equal((await support.GET(req("/api/support"))).status, 401);
  authenticated = true;
  assert.equal((await support.GET(req("/api/support"))).status, 403);
  assert.equal(
    (
      await support.PATCH(
        req("/api/support", "PATCH", {
          id,
          status: "handled",
          previousStatus: "new",
          operator: true,
        }),
      )
    ).status,
    403,
  );
  assert.equal(calls.length, 0);
});
test("operator support inbox is paginated, bounded, private and detects stale updates", async () => {
  process.env.SCREENME_OPERATOR_IDS = uid;
  const response = await support.GET(req("/api/support?status=new&page=0"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(calls.at(-1)?.url.searchParams.get("status"), "eq.new");
  assert.equal((await support.GET(req("/api/support?status=any"))).status, 400);
  assert.equal((await support.GET(req("/api/support?page=-1"))).status, 400);
  const update = () =>
    support.PATCH(
      req("/api/support", "PATCH", {
        id,
        status: "handled",
        previousStatus: "new",
      }),
    );
  assert.equal((await update()).status, 200);
  assert.equal(calls.at(-1)?.url.searchParams.get("status"), "eq.new");
  found = false;
  assert.equal((await update()).status, 409);
});
