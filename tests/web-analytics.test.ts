import { test } from "node:test";
import assert from "node:assert/strict";
import { filterPageView } from "../src/app/lib/webAnalytics";

test("page views strip workspace, payment and authentication query data", () => {
  for (const path of ["/resume", "/success", "/login", "/checkout"]) {
    const url = `https://www.screenme.dev${path}?review=private-id&session_id=cs_secret&email=private@example.com#access_token=secret`;
    const event = { type: "pageview" as const, url };
    assert.deepEqual(filterPageView(event), {
      type: "pageview", url: `https://www.screenme.dev${path}`,
    });
    assert.equal(event.url, url, "Does not alter the actual navigation URL");
  }
});

test("saved-record views never identify a resume or application", () => {
  for (const kind of ["resumes", "applications"]) {
    assert.deepEqual(filterPageView({ type: "pageview", url: `https://www.screenme.dev/${kind}/private-record-id/?download=1` }), {
      type: "pageview", url: `https://www.screenme.dev/${kind}/[id]`,
    });
  }
});

test("private, unknown and malformed paths and custom events are not tracked", () => {
  for (const path of ["/support", "/insights", "/reset-password", "/auth/callback", "/unknown/private-value"]) {
    assert.equal(filterPageView({ type: "pageview", url: `https://www.screenme.dev${path}` }), null);
  }
  assert.equal(filterPageView({ type: "pageview", url: "not a URL" }), null);
  assert.equal(filterPageView({ type: "pageview", url: "javascript:alert(1)" }), null);
  assert.equal(filterPageView({ type: "event", url: "https://www.screenme.dev/" }), null);
});
