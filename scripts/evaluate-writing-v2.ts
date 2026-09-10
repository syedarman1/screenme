import assert from "node:assert/strict";
import {
  generateWriting,
  writingInput,
  type WritingKind,
} from "../src/app/lib/writingEngine";
import {
  strongResume,
  jobDescription,
  nurseResume,
} from "../tests/analysis-fixtures";
async function main() {
  const cases = [
    { kind: "tailor", resume: strongResume, job: jobDescription },
    {
      kind: "letter",
      resume: strongResume,
      job: jobDescription,
      company: "Example Analytics",
      jobTitle: "Backend Engineer",
    },
    {
      kind: "interview",
      resume: nurseResume,
      job: "Registered Nurse. Requirements: RN license and BLS certification. Provide inpatient care, coordinate discharge planning and educate families about medication safety.",
    },
    {
      kind: "improve",
      resume: strongResume,
      passage:
        "Led code reviews for a four-person team and documented deployment procedures.",
      instruction: "Clarify the contribution using only supplied facts.",
      facts: "The documentation became the team's onboarding reference.",
    },
  ] as const;
  for (const c of cases) {
    const result = await generateWriting(
      c.kind as WritingKind,
      writingInput.parse(c),
    );
    assert.ok(result.content.length > 20);
    if (c.kind === "interview") {
      assert.equal(result.questions?.length, 6);
      assert.doesNotMatch(JSON.stringify(result), /\b(?:Python|AWS|SQL)\b/);
    }
    console.log(JSON.stringify({ kind: c.kind, result }));
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
