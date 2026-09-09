import { test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { writingInput, generateWriting } from "../src/app/lib/writingEngine";
import { writingResponse } from "../src/app/lib/writingResponse";
import { strongResume, jobDescription } from "./analysis-fixtures";
const native = globalThis.fetch;
let verified = true;
let output = strongResume;
let calls = 0;
let usable = true;
beforeEach(() => {
  verified = true;
  output = strongResume;
  calls = 0;
  usable = true;
  process.env.OPENAI_API_KEY = "synthetic";
  globalThis.fetch = async (_input, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.model, "gpt-5.6-terra");
    assert.equal(body.reasoning_effort, "low");
    const result =
      body.response_format.json_schema.name === "career_claim_check"
        ? {
            supported: verified,
            reason: verified ? "Supported" : "Invented qualification",
          }
        : { usable, content: output, questions: [] };
    return Response.json({
      id: "test",
      object: "chat.completion",
      created: 0,
      model: body.model,
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: JSON.stringify(result),
            refusal: null,
          },
        },
      ],
    });
  };
});
after(() => {
  globalThis.fetch = native;
});
const input = () =>
  writingInput.parse({ resume: strongResume, job: jobDescription });
test("writing uses a separate factual check before returning a usable draft", async () => {
  const r = await generateWriting("tailor", input());
  assert.equal(r.content, strongResume);
  assert.equal(r.version, "2.0");
  assert.equal(calls, 2);
});
test("unsupported claims reject the whole draft and are not exposed", async () => {
  verified = false;
  const r = await writingResponse(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(input()),
    }),
    "tailor",
  );
  assert.equal(r.status, 502);
  assert.doesNotMatch(await r.text(), /Invented qualification|Alex Morgan/);
  assert.equal(calls, 2);
});
test("invented numbers reject before the second provider call", async () => {
  output = "Delivered a 99% improvement.";
  await assert.rejects(
    generateWriting("tailor", input()),
    /unsupported number/,
  );
  assert.equal(calls, 1);
});
test("edits require a real source passage; unrelated input is not treated as a weak resume", async () => {
  await assert.rejects(
    generateWriting("improve", { ...input(), passage: "Invented passage" }),
    /unchanged passage/,
  );
  assert.equal(calls, 0);
  usable = false;
  await assert.rejects(
    generateWriting("tailor", input()),
    /real job description/,
  );
});
test("malformed inputs cannot reach the writing provider", async () => {
  const r = await writingResponse(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ resume: 42, job: jobDescription }),
    }),
    "tailor",
  );
  assert.equal(r.status, 400);
  assert.equal(calls, 0);
});
