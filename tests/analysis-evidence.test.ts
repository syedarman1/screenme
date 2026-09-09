import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sourcePassages,
  sourceSchemas,
  resolveScanEvidence,
  resolveMatchEvidence,
} from "../src/app/lib/analysisEvidence";
import {
  AnalysisValidationError,
  validateScan,
  validateMatch,
} from "../src/app/lib/analysisV2";
import {
  strongResume,
  jobDescription,
  scanFixture,
  matchFixture,
} from "./analysis-fixtures";

function scanReferences() {
  const result = scanFixture();
  result.assessments = {
    clarity: { ...result.assessments.clarity, evidence: "R5" },
    impact: { ...result.assessments.impact, evidence: "R5" },
    organization: { ...result.assessments.organization, evidence: "R9" },
  };
  result.strengths[0].evidence = "R5";
  return result;
}

test("scanner displays original passages, with no model-authored quotation", () => {
  const resolved = resolveScanEvidence(
    scanReferences(),
    sourcePassages(strongResume, "R"),
  );
  assert.equal(resolved.strengths[0].evidence, strongResume.split("\n")[4]);
  assert.equal(
    resolved.assessments.organization.evidence,
    strongResume.split("\n")[8],
  );
  validateScan(resolved, strongResume);
});

test("unknown, paraphrased, combined and cross-document references are rejected", () => {
  for (const reference of [
    "R999",
    "J5",
    "R5,R6",
    "R5 R6",
    "Built Python APIs and served users",
    " R5 ",
  ]) {
    const result = scanReferences();
    result.strengths[0].evidence = reference;
    assert.throws(
      () => resolveScanEvidence(result, sourcePassages(strongResume, "R")),
      AnalysisValidationError,
    );
  }
});

test("matcher resolves each document separately and preserves missing evidence", () => {
  const result = matchFixture();
  for (const [index, requirement] of result.requirements.entries()) {
    requirement.jobEvidence = ["J3", "J4", "J8"][index];
    requirement.resumeEvidence = ["R6", "R8", null][index];
  }
  const resolved = resolveMatchEvidence(
    result,
    sourcePassages(strongResume, "R"),
    sourcePassages(jobDescription, "J"),
  );
  validateMatch(resolved, strongResume, jobDescription);
  assert.equal(resolved.requirements[2].resumeEvidence, null);
  result.requirements[0].jobEvidence = "R3";
  assert.throws(
    () =>
      resolveMatchEvidence(
        result,
        sourcePassages(strongResume, "R"),
        sourcePassages(jobDescription, "J"),
      ),
    AnalysisValidationError,
  );
});

test("long and fragmented documents retain bounded, exact source passages", () => {
  for (const source of [
    "word ".repeat(10_000),
    "X".repeat(50_000),
    "A\n".repeat(25_000),
    "\n  Skills: SQL\r\n\r\n  Education: Example College  \n",
  ]) {
    const passages = sourcePassages(source, "R");
    assert.ok(passages.length <= 90);
    assert.ok(passages.length > 0);
    for (const passage of passages) {
      assert.ok(passage.text.length <= 1800);
      assert.ok(
        source.includes(passage.text),
        "Every passage is an unchanged contiguous source slice",
      );
    }
    assert.equal(
      passages
        .map((p) => p.text)
        .join("")
        .replace(/\s/g, ""),
      source.replace(/\s/g, ""),
    );
  }
});

test("provider schema permits only supplied IDs in the correct document fields", () => {
  const schemas = sourceSchemas(
    sourcePassages(strongResume, "R"),
    sourcePassages(jobDescription, "J"),
  );
  assert.equal(schemas.scan.safeParse(scanReferences()).success, true);
  const invalid = scanReferences();
  invalid.strengths[0].evidence = "R999";
  assert.equal(schemas.scan.safeParse(invalid).success, false);
  invalid.strengths[0].evidence = "Built Python APIs serving users";
  assert.equal(schemas.scan.safeParse(invalid).success, false);
  const requirement = schemas.match!.shape.requirements.element;
  const match = {
    ...matchFixture().requirements[0],
    resumeEvidence: "R6",
    jobEvidence: "J3",
  };
  assert.equal(requirement.safeParse(match).success, true);
  assert.equal(
    requirement.safeParse({ ...match, jobEvidence: "R3" }).success,
    false,
  );
});

test("empty optional actions normalize to null only for fully supported requirements", () => {
  const result = matchFixture();
  result.requirements = [
    {
      ...result.requirements[0],
      resumeEvidence: "R6",
      jobEvidence: "J3",
      nextStep: "",
    },
  ];
  const resume = sourcePassages(strongResume, "R");
  const job = sourcePassages(jobDescription, "J");
  const resolved = resolveMatchEvidence(result, resume, job);
  assert.equal(resolved.requirements[0].nextStep, null);
  validateMatch(resolved, strongResume, jobDescription);
  result.requirements[0].status = "partial";
  assert.throws(
    () =>
      validateMatch(
        resolveMatchEvidence(result, resume, job),
        strongResume,
        jobDescription,
      ),
    AnalysisValidationError,
  );
});
