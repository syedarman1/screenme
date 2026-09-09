import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasSourceEvidence,
  validateScan,
  validateMatch,
  requirementCoverage,
  scanInputSchema,
  matchInputSchema,
  AnalysisValidationError,
} from "../src/app/lib/analysisV2";
import {
  strongResume,
  jobDescription,
  scanFixture,
  matchFixture,
} from "./analysis-fixtures";

test("source checks tolerate PDF whitespace but reject paraphrases and invented metrics", () => {
  assert.ok(
    hasSourceEvidence(
      "Reduced p95 latency\nfrom 800ms   to 240ms.",
      "Reduced p95 latency from 800ms to 240ms.",
    ),
  );
  assert.equal(
    hasSourceEvidence(strongResume, "Reduced latency by 95%"),
    false,
  );
  assert.equal(hasSourceEvidence(strongResume, " "), false);
});
test("strong scans may have zero findings; no filler issues or made-up score", () => {
  const result = validateScan(scanFixture(), strongResume);
  assert.equal(result.findings.length, 0);
  assert.equal("score" in result, false);
});
test("unsupported scan evidence fails closed instead of being dropped into a perfect report", () => {
  const scan = scanFixture();
  scan.strengths[0].evidence = "Increased revenue by 200%";
  assert.throws(
    () => validateScan(scan, strongResume),
    AnalysisValidationError,
  );
});
test("findings retain their own evidence and action when sorted by priority", () => {
  const scan = scanFixture();
  scan.findings = [
    {
      section: "Experience",
      priority: "low",
      title: "Polish",
      evidence: "Led code reviews",
      explanation: "Low priority.",
      nextStep: "First action",
    },
    {
      section: "Skills",
      priority: "high",
      title: "Clarify",
      evidence: "Skills: Python",
      explanation: "High priority.",
      nextStep: "Second action",
    },
  ];
  assert.equal(
    validateScan(scan, strongResume).findings[0].nextStep,
    "Second action",
  );
});
test("coverage weights mandatory requirements above preferences and credits partial evidence by half", () => {
  const match = validateMatch(matchFixture(), strongResume, jobDescription);
  assert.deepEqual(requirementCoverage(match.requirements), {
    percent: 64,
    supported: 1,
    partial: 1,
    notEvidenced: 1,
    total: 3,
  });
});
test("matcher rejects invented JD evidence, invented resume evidence, and duplicate requirements", () => {
  for (const field of ["jobEvidence", "resumeEvidence"] as const) {
    const match = matchFixture();
    match.requirements[0][field] = "Must have a doctorate in astrophysics";
    assert.throws(
      () => validateMatch(match, strongResume, jobDescription),
      AnalysisValidationError,
    );
  }
  const match = matchFixture();
  match.requirements.push(match.requirements[0]);
  assert.throws(
    () => validateMatch(match, strongResume, jobDescription),
    AnalysisValidationError,
  );
});
test("matched qualifications require evidence; missing qualifications require a next step", () => {
  const match = matchFixture();
  match.requirements[0].resumeEvidence = null;
  assert.throws(
    () => validateMatch(match, strongResume, jobDescription),
    AnalysisValidationError,
  );
  const missing = matchFixture();
  missing.requirements[2].nextStep = null;
  assert.throws(
    () => validateMatch(missing, strongResume, jobDescription),
    AnalysisValidationError,
  );
  assert.throws(
    () =>
      validateMatch(
        { ...match, requirements: [] },
        strongResume,
        jobDescription,
      ),
    AnalysisValidationError,
  );
});
test("input validation rejects wrong types, oversized documents, whitespace and empty postings", () => {
  for (const resume of [[], 42, " ".repeat(150), "x".repeat(50_001)])
    assert.equal(scanInputSchema.safeParse({ resume }).success, false);
  assert.equal(
    matchInputSchema.safeParse({ resume: strongResume, job: " " }).success,
    false,
  );
  assert.equal(
    scanInputSchema.safeParse({
      resume: strongResume,
      targetRole: "x".repeat(121),
    }).success,
    false,
  );
});

test("unusable input is distinct from a weak resume and empty feedback is rejected", () => {
  const scan = scanFixture();
  scan.inputsUsable = false;
  assert.throws(
    () => validateScan(scan, strongResume),
    /couldn't identify enough resume content/,
  );
  scan.inputsUsable = true;
  scan.summary = " ";
  assert.throws(() => validateScan(scan, strongResume), /analysis.summary/);
});

test("a quoted passage cannot justify claiming existing headings are absent", () => {
  const scan = scanFixture();
  scan.assessments.organization = {
    rating: "developing",
    evidence: "Experience\nSoftware Engineer, Example Systems",
    explanation:
      "The lack of section headers for skills and education makes navigation harder.",
  };
  assert.throws(
    () => validateScan(scan, strongResume),
    /contradicts an existing resume heading/,
  );
});

test("adding detail to an existing section is still valid feedback", () => {
  const scan = scanFixture();
  scan.findings = [
    {
      section: "Skills",
      priority: "low",
      title: "Connect skills to projects",
      evidence: "Skills: Python, SQL, PostgreSQL, Git, REST APIs",
      explanation: "Add project context to the skills section if accurate.",
      nextStep: "Describe a SQL project you actually completed.",
    },
  ];
  assert.equal(validateScan(scan, strongResume).findings.length, 1);
});

test("source quotes tolerate escaped JSON newlines without accepting changed words", () => {
  assert.ok(
    hasSourceEvidence(
      "Experience\nSoftware Engineer",
      "Experience\\nSoftware Engineer",
    ),
  );
  assert.equal(
    hasSourceEvidence(
      "Experience\nSoftware Engineer",
      "Experience\\nEngineering Manager",
    ),
    false,
  );
});

test("existing headings can be praised or given content advice without a false contradiction", () => {
  const scan = scanFixture();
  scan.assessments.organization.explanation =
    "No need to add Skills or Education headers; they are already present.";
  assert.doesNotThrow(() => validateScan(scan, strongResume));
});

test("explicitly optional polish cannot be presented as a high priority", () => {
  const review = scanFixture();
  review.findings = [
    {
      section: "Experience",
      priority: "high",
      title: "Optional: expand collaboration context",
      evidence: "Led code reviews for a four-person team",
      explanation: "Additional context may help.",
      nextStep: "Describe cross-team work if accurate.",
    },
  ];
  assert.equal(validateScan(review, strongResume).findings[0].priority, "low");
});
