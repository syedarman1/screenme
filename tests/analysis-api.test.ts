import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  scanFixture,
  matchFixture,
  strongResume,
  jobDescription,
} from "./analysis-fixtures";
let scan: typeof import("../src/app/api/analyzeResume/route");
let match: typeof import("../src/app/api/jobMatch/route");
const originalFetch = globalThis.fetch;
let mode:
  "valid" | "invented" | "refused" | "unavailable" | "truncated" | "heading" =
  "valid";
let authenticated = true;
let allowed = true;
let settlements: boolean[] = [];
let providerCalls = 0;
const request = (body: unknown) =>
  new Request("http://localhost/api/analysis", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-ScreenMe-Analysis-Version": "2",
      Authorization: "Bearer synthetic",
    },
    body: JSON.stringify(body),
  });
before(async () => {
  process.env.OPENAI_API_KEY = "synthetic-key";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://analysis.supabase.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "synthetic-anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service";
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith("https://api.openai.com/")) {
      providerCalls++;
      const body = JSON.parse(String(init?.body));
      assert.equal(body.response_format.type, "json_schema");
      assert.equal(body.response_format.json_schema.strict, true);
      assert.equal(body.messages[1].role, "user");
      assert.ok(
        body.messages[0].content.includes(
          new Date().toISOString().slice(0, 10),
        ),
      );
      const documents = JSON.parse(body.messages[1].content);
      assert.equal(
        documents.resumePassages
          .map((p: { text: string }) => p.text)
          .join("\n"),
        strongResume,
      );
      if (mode === "unavailable")
        return Response.json(
          {
            error: {
              message: "Provider account has no credit",
              code: "insufficient_quota",
              type: "insufficient_quota",
            },
          },
          { status: 429 },
        );
      const data =
        body.response_format.json_schema.name === "resume_review_v2"
          ? scanFixture()
          : matchFixture();
      const reference = (
        text: string,
        passages: { id: string; text: string }[],
      ) => {
        const passage = passages.find((p) => p.text.includes(text));
        assert.ok(
          passage,
          `Fixture must have an actual source passage: ${text}`,
        );
        return passage.id;
      };
      if ("assessments" in data) {
        for (const item of Object.values(data.assessments))
          if (item.evidence)
            item.evidence = reference(item.evidence, documents.resumePassages);
        for (const item of [...data.findings, ...data.strengths])
          item.evidence = reference(item.evidence, documents.resumePassages);
      } else {
        for (const item of data.requirements) {
          item.jobEvidence = reference(item.jobEvidence, documents.jobPassages);
          if (item.resumeEvidence)
            item.resumeEvidence = reference(
              item.resumeEvidence,
              documents.resumePassages,
            );
        }
      }
      if (mode === "heading" && "assessments" in data)
        data.assessments.organization.explanation =
          "The Skills and Education headings are missing.";
      if (mode === "invented" && "strengths" in data)
        data.strengths[0].evidence = "Fabricated experience at Mars Inc";
      return Response.json({
        id: "synthetic",
        object: "chat.completion",
        created: 0,
        model: body.model,
        choices: [
          {
            index: 0,
            finish_reason: mode === "truncated" ? "length" : "stop",
            message: {
              role: "assistant",
              content: mode === "refused" ? null : JSON.stringify(data),
              refusal: mode === "refused" ? "Cannot review this input" : null,
            },
          },
        ],
      });
    }
    assert.ok(url.startsWith("https://analysis.supabase.invalid/"));
    if (url.includes("/auth/v1/user"))
      return Response.json(
        authenticated
          ? { id: "00000000-0000-4000-8000-000000000001" }
          : { message: "Unauthorized" },
        { status: authenticated ? 200 : 401 },
      );
    const body = JSON.parse(String(init?.body || "{}"));
    if (url.endsWith("screenme_rate_limit"))
      return Response.json({ success: true });
    if (url.endsWith("screenme_usage"))
      return Response.json({
        allowed,
        plan: "free",
        reservationId: allowed
          ? "00000000-0000-4000-8000-000000000002"
          : undefined,
      });
    if (url.endsWith("screenme_finish_usage")) {
      settlements.push(body.p_success);
      return Response.json(true);
    }
    throw new Error("Unexpected network request");
  };
  scan = await import("../src/app/api/analyzeResume/route");
  match = await import("../src/app/api/jobMatch/route");
});
beforeEach(() => {
  mode = "valid";
  authenticated = true;
  allowed = true;
  settlements = [];
  providerCalls = 0;
});
after(() => {
  globalThis.fetch = originalFetch;
});
test("v2 scan and match return verified structured results, no-store, and settle exactly once", async () => {
  const scanResponse = await scan.POST(request({ resume: strongResume }));
  assert.equal(scanResponse.status, 200);
  assert.equal(scanResponse.headers.get("cache-control"), "no-store");
  assert.equal((await scanResponse.json()).version, "2.0");
  const matchResponse = await match.POST(
    request({ resume: strongResume, job: jobDescription }),
  );
  assert.equal(matchResponse.status, 200);
  assert.equal((await matchResponse.json()).coverage.percent, 64);
  assert.deepEqual(settlements, [true, true]);
});
test("unverified, refused, and truncated output refund usage without exposing AI content", async () => {
  for (const failure of [
    "invented",
    "refused",
    "truncated",
    "heading",
  ] as const) {
    mode = failure;
    const response = await scan.POST(request({ resume: strongResume }));
    assert.equal(response.status, 502);
    assert.doesNotMatch(
      await response.text(),
      /Mars|synthetic-key|Cannot review this input/,
    );
  }
  assert.deepEqual(settlements, [false, false, false, false]);
});
test("provider credit failures refund usage and are not retried", async () => {
  mode = "unavailable";
  const response = await scan.POST(request({ resume: strongResume }));
  assert.equal(response.status, 503);
  assert.equal(providerCalls, 1);
  assert.deepEqual(settlements, [false]);
});
test("invalid documents refund before any AI call; authentication and plan gates remain enforced", async () => {
  assert.equal((await scan.POST(request({ resume: 42 }))).status, 400);
  assert.equal(
    (await match.POST(request({ resume: strongResume, job: "" }))).status,
    400,
  );
  assert.deepEqual(settlements, [false, false]);
  assert.equal(providerCalls, 0);
  authenticated = false;
  assert.equal(
    (await scan.POST(request({ resume: strongResume }))).status,
    401,
  );
  authenticated = true;
  allowed = false;
  assert.equal(
    (await match.POST(request({ resume: strongResume, job: jobDescription })))
      .status,
    403,
  );
  assert.equal(providerCalls, 0);
});

test("an already-open v1 page gets a refresh message instead of incompatible results", async () => {
  const legacy = request({ resume: strongResume });
  legacy.headers.delete("X-ScreenMe-Analysis-Version");
  const response = await scan.POST(legacy);
  assert.equal(response.status, 409);
  assert.match(await response.text(), /Refresh/);
  assert.equal(providerCalls, 0);
  assert.deepEqual(settlements, [false]);
});
