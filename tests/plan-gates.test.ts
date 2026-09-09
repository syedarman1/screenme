import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { nextDashboardAction, remainingUses, type DashboardData } from "../src/app/lib/plans";

const empty: DashboardData = { plan: "free", usage: { resume_scans: 0, job_matches: 0, resume_tailors: 0, cover_letters: 0, interview_preps: 0, job_imports: 0 }, savedResumes: 0, applications: 0, recentApplications: [], billingAvailable: false, nextResetAt: "2026-10-01T00:00:00Z" };
test("dashboard suggestions avoid depleted tools and clamp downgraded usage", () => {
  assert.equal(nextDashboardAction(empty).href, "/resume");
  assert.equal(nextDashboardAction({ ...empty, savedResumes: 1 }).href, "/jobmatch");
  const exhausted = { ...empty, usage: { ...empty.usage, resume_scans: 20, job_matches: 20, resume_tailors: 20, cover_letters: 20 } };
  assert.equal(nextDashboardAction(exhausted).href, "/applications");
  assert.equal(remainingUses("free", exhausted.usage, "resume_scan"), 0);
  assert.equal(remainingUses("pro", exhausted.usage, "resume_scan"), null);
});

let dashboard: typeof import("../src/app/api/dashboard/route");
let resumes: typeof import("../src/app/api/resumes/route");
let applications: typeof import("../src/app/api/applications/route");
let imports: typeof import("../src/app/api/parseJobUrl/route");
const originalFetch = globalThis.fetch;
const uid = "00000000-0000-4000-8000-000000000001";
let authenticated = true;
let failCounts = false;
let calls: string[] = [];
const request = (path: string, body: unknown) => new NextRequest(`https://screenme.invalid${path}`, { method: "POST", headers: { Authorization: "Bearer synthetic", "Content-Type": "application/json" }, body: JSON.stringify(body) });
before(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://gating.supabase.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "synthetic-anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service";
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    assert.equal(url.origin, "https://gating.supabase.invalid");
    calls.push(url.pathname);
    if (url.pathname.includes("/auth/")) return Response.json(authenticated ? { id: uid } : { message: "Unauthorized" }, { status: authenticated ? 200 : 401 });
    const body = JSON.parse(String(init?.body || "{}"));
    if (url.pathname.endsWith("screenme_rate_limit")) return Response.json({ success: true });
    if (url.pathname.endsWith("screenme_usage")) {
      assert.equal(body.p_user_id, uid);
      if (body.p_consume) { assert.equal(body.p_feature, "job_import"); return Response.json({ allowed: false, plan: "free", limit: 5, remaining: 0, reason: "quota" }); }
      return Response.json({ ...empty.usage, plan: "free" });
    }
    if (init?.method === "POST") {
      assert.equal(body.user_id, uid);
      const resource = url.pathname.endsWith("resume_versions") ? "resume_versions" : "job_applications";
      return Response.json({ code: "P0001", message: "SAVED_ITEM_LIMIT", details: JSON.stringify({ resource, plan: "free", limit: resource === "resume_versions" ? 3 : 10 }) }, { status: 400 });
    }
    assert.equal(url.searchParams.get("user_id"), `eq.${uid}`);
    if (init?.method === "HEAD") return new Response(null, { status: failCounts ? 503 : 200, headers: failCounts ? {} : { "Content-Range": "*/2" } });
    if (url.pathname.endsWith("user_plans")) return Response.json({ stripe_customer_id: null });
    return Response.json([{ id: "example", company: "Example", role: "Engineer", status: "applied" }]);
  };
  dashboard = await import("../src/app/api/dashboard/route");
  resumes = await import("../src/app/api/resumes/route");
  applications = await import("../src/app/api/applications/route");
  imports = await import("../src/app/api/parseJobUrl/route");
});
beforeEach(() => { authenticated = true; failCounts = false; calls = []; });
after(() => { globalThis.fetch = originalFetch; });

test("dashboard is owner-scoped, uncached, and does not turn failed counts into zero", async () => {
  const response = await dashboard.GET(request("/api/dashboard", {}));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.savedResumes, 2);
  assert.equal(body.applications, 2);
  assert.equal(body.usage.job_imports, 0);
  failCounts = true;
  assert.equal((await dashboard.GET(request("/api/dashboard", {}))).status, 503);
});

test("saved-item database caps become useful HTTP 403 responses", async () => {
  const resume = await resumes.POST(request("/api/resumes", { user_id: "someone-else", name: "Test", content: "Synthetic test resume content that is long enough to save." }));
  assert.equal(resume.status, 403);
  assert.equal((await resume.json()).limit, 3);
  const application = await applications.POST(request("/api/applications", { user_id: "someone-else", company: "Example", role: "Engineer" }));
  assert.equal(application.status, 403);
  assert.equal((await application.json()).limit, 10);
});

test("exhausted imports stop before AI and explain the manual-paste alternative", async () => {
  const result = await imports.POST(request("/api/parseJobUrl", { url: "https://jobs.lever.co/example/job" }));
  assert.equal(result.status, 403);
  assert.match((await result.json()).error, /paste the job description manually/);
});

test("dashboard, imports, and saved-item writes require sign-in", async () => {
  authenticated = false;
  for (const handler of [dashboard.GET, imports.POST, resumes.POST, applications.POST]) assert.equal((await handler(request("/api/test", {}))).status, 401);
  assert.ok(calls.every(path => path.includes("/auth/")));
});
