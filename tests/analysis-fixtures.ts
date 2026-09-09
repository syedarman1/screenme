import type { ScanAnalysis, MatchAnalysis } from "../src/app/lib/analysisV2";
// Synthetic candidates and postings; never use customer resumes in regression fixtures.
export const strongResume = `Alex Morgan
Software Engineer
Experience
Software Engineer, Example Systems | Jan 2022 - Dec 2025
Built Python APIs serving 40,000 monthly users and reduced p95 latency from 800ms to 240ms.
Used Python daily for API development throughout Jan 2022 - Dec 2025.
Led code reviews for a four-person team and documented deployment procedures.
Skills: Python, SQL, PostgreSQL, Git, REST APIs
Education: BS Computer Science, Example University, 2021`;
export const weakResume = `Alex Morgan
Experience
Assistant at Example Company
Responsible for helping with things and various office tasks.
Worked with the team on projects and attended meetings.
Skills: Communication, Microsoft Excel
Education: BA Business, Example University`;
export const nurseResume = `Jordan Lee, RN
Registered Nurse
Experience
Registered Nurse, Example Community Hospital | 2021 - 2025
Provided inpatient care for a six-patient assignment, coordinated discharge planning, and educated families about medication safety.
Mentored newly registered nurses during supervised orientation shifts.
Credentials: Registered Nurse license, BLS certification
Education: Bachelor of Science in Nursing, Example College, 2021`;
export const jobDescription = `Backend Engineer at Example Analytics
Requirements:
At least 3 years of professional Python OR R development experience is required.
Must have experience with SQL databases.
Responsibilities:
Collaborate on code reviews and document engineering decisions.
Nice to have:
AWS certification is preferred, not required.
Benefits: Flexible working hours and a learning budget.`;

export function scanFixture(): ScanAnalysis {
  const assessment = {
    rating: "strong" as const,
    evidence: "Built Python APIs serving 40,000 monthly users",
    explanation: "Clearly describes scope.",
  };
  return {
    inputsUsable: true,
    summary: "Specific evidence of engineering work.",
    assessments: {
      clarity: { ...assessment },
      impact: { ...assessment },
      organization: {
        ...assessment,
        evidence: "Education: BS Computer Science",
      },
    },
    findings: [],
    strengths: [
      {
        title: "Clear scope",
        evidence: assessment.evidence,
        explanation: "Names users served.",
      },
    ],
  };
}
export function matchFixture(): MatchAnalysis {
  return {
    inputsUsable: true,
    summary: "Relevant engineering experience; certification is not shown.",
    requirements: [
      {
        title: "Python or R experience",
        importance: "required",
        jobEvidence:
          "At least 3 years of professional Python OR R development experience is required.",
        status: "supported",
        resumeEvidence:
          "Used Python daily for API development throughout Jan 2022 - Dec 2025.",
        explanation: "The Python alternative is documented.",
        nextStep: null,
      },
      {
        title: "SQL databases",
        importance: "required",
        jobEvidence: "Must have experience with SQL databases.",
        status: "partial",
        resumeEvidence: "Skills: Python, SQL, PostgreSQL, Git, REST APIs",
        explanation: "Listed as a skill; project context is unclear.",
        nextStep: "Describe a SQL project if accurate.",
      },
      {
        title: "AWS certification",
        importance: "preferred",
        jobEvidence: "AWS certification is preferred, not required.",
        status: "not_evidenced",
        resumeEvidence: null,
        explanation:
          "The resume does not document this optional certification.",
        nextStep: "Include a certification only if you hold it.",
      },
    ],
  };
}
