import { z } from "zod";

export const ANALYSIS_VERSION = "2.0" as const;
export const MAX_RESUME_LENGTH = 50_000;
export const MAX_JOB_LENGTH = 25_000;
export const scanInputSchema = z.object({
  resume: z
    .string()
    .trim()
    .min(100, "Include at least 100 characters of resume text.")
    .max(MAX_RESUME_LENGTH),
  targetRole: z.string().trim().max(120).optional(),
});
export const matchInputSchema = scanInputSchema.extend({
  job: z
    .string()
    .trim()
    .min(50, "Include at least 50 characters of the job description.")
    .max(MAX_JOB_LENGTH),
});

// Structured Outputs handles shape; semantic bounds and sources are checked below.
const assessmentSchema = z.object({
  rating: z.enum(["strong", "developing", "limited", "not_assessable"]),
  evidence: z.string().nullable(),
  explanation: z.string(),
});
export const scanSchema = z.object({
  inputsUsable: z
    .boolean()
    .describe(
      "True when the supplied documents contain a meaningful resume and, for matching, a job posting. Weak or brief resumes are still usable.",
    ),
  summary: z.string(),
  assessments: z.object({
    clarity: assessmentSchema,
    impact: assessmentSchema,
    organization: assessmentSchema,
  }),
  findings: z.array(
    z.object({
      section: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      title: z.string(),
      evidence: z.string(),
      explanation: z.string(),
      nextStep: z.string(),
    }),
  ),
  strengths: z.array(
    z.object({
      title: z.string(),
      evidence: z.string(),
      explanation: z.string(),
    }),
  ),
});
export const matchSchema = z.object({
  inputsUsable: z
    .boolean()
    .describe(
      "True when the supplied documents contain a meaningful resume and, for matching, a job posting. Weak or brief resumes are still usable.",
    ),
  summary: z.string(),
  requirements: z.array(
    z.object({
      title: z.string(),
      importance: z.enum(["required", "preferred", "unspecified"]),
      jobEvidence: z.string(),
      status: z.enum(["supported", "partial", "not_evidenced"]),
      resumeEvidence: z.string().nullable(),
      explanation: z.string(),
      nextStep: z.string().nullable(),
    }),
  ),
});
export type ScanAnalysis = z.infer<typeof scanSchema>;
export type MatchAnalysis = z.infer<typeof matchSchema>;
export type Requirement = MatchAnalysis["requirements"][number];
export type ScanResult = ScanAnalysis & {
  runId?: string;
  version: typeof ANALYSIS_VERSION;
  analyzedAt: string;
};
export type MatchResult = MatchAnalysis & {
  runId?: string;
  version: typeof ANALYSIS_VERSION;
  analyzedAt: string;
  coverage: ReturnType<typeof requirementCoverage>;
};
export class AnalysisValidationError extends Error {}
export class AnalysisInputError extends Error {}
function normalized(text: string) {
  return text
    .normalize("NFKC")
    .replace(/\\[nrt]/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
export function hasSourceEvidence(source: string, quote: string) {
  const needle = normalized(quote);
  return needle.length >= 3 && normalized(source).includes(needle);
}
function requireEvidence(source: string, quote: string | null) {
  if (!quote || !hasSourceEvidence(source, quote))
    throw new AnalysisValidationError("Evidence could not be verified.");
}
function checkStrings(value: unknown, path = "analysis"): void {
  if (typeof value === "string" && (!value.trim() || value.length > 2000))
    throw new AnalysisValidationError(`Invalid analysis text at ${path}.`);
  if (Array.isArray(value))
    value.forEach((item, index) => checkStrings(item, `${path}[${index}]`));
  else if (value && typeof value === "object")
    Object.entries(value).forEach(([key, item]) =>
      checkStrings(item, `${path}.${key}`),
    );
}

// Narrow contradiction check: an existing explicit heading must not be called
// absent. Content/impact advice about that section remains valid.
export function rejectMissingHeadingClaims(resume: string, claims: string[]) {
  const headings = [
    "skills",
    "education",
    "experience",
    "certifications",
    "projects",
  ];
  for (const heading of headings) {
    if (
      !new RegExp(
        `^\\s*(?:technical |professional |work )?${heading}\\s*(?::|$)`,
        "im",
      ).test(resume)
    )
      continue;
    for (const claim of claims.flatMap((text) => text.split(/[.!?]+/))) {
      const text = normalized(claim);
      const namesHeading = new RegExp(`\\b${heading}\\b`).test(text);
      if (
        /\b(?:no need|not missing|already present|does not lack|doesn't lack|no missing)\b/.test(
          text,
        )
      )
        continue;
      const missing =
        /\b(?:lack(?:s|ing)?(?: of)?|missing|absent|without|add|include|create|introduce)\s+(?:(?:a|an|the|clear|explicit|separate|dedicated|section|skills|education|experience|certifications|projects|and|or)\s+){0,7}(?:headers?|headings?|sections?)\b/.test(
          text,
        ) ||
        /\b(?:headers?|headings?|sections?)\s+(?:(?:for|skills|education|experience|certifications|projects|and|or|is|are)\s+){0,7}(?:missing|absent|lacking)(?=$|[,:;]|\s+(?:from|in|on|and|which|making|so|but)\b)/.test(
          text,
        ) ||
        new RegExp(
          `\\bno\\s+(?:separate\\s+)?${heading}\\s+(?:section|heading|header)\\b`,
        ).test(text);
      if (namesHeading && missing)
        throw new AnalysisValidationError(
          "Advice contradicts an existing resume heading.",
        );
    }
  }
}
export function validateScan(
  analysis: ScanAnalysis,
  resume: string,
): ScanAnalysis {
  if (!analysis.inputsUsable)
    throw new AnalysisInputError(
      "We couldn't identify enough resume content. Include your experience, education, or projects and try again.",
    );
  checkStrings(analysis);
  if (analysis.findings.length > 6 || analysis.strengths.length > 4)
    throw new AnalysisValidationError("Too many findings.");
  for (const assessment of Object.values(analysis.assessments)) {
    if (assessment.rating !== "not_assessable" || assessment.evidence !== null)
      requireEvidence(resume, assessment.evidence);
  }
  for (const item of [...analysis.findings, ...analysis.strengths])
    requireEvidence(resume, item.evidence);
  if (
    Object.values(analysis.assessments).every(
      (item) => item.rating === "not_assessable",
    )
  )
    throw new AnalysisValidationError("No assessable content.");
  rejectMissingHeadingClaims(resume, [
    analysis.summary,
    ...Object.values(analysis.assessments).map((item) => item.explanation),
    ...analysis.findings.flatMap((item) => [
      item.title,
      item.explanation,
      item.nextStep,
    ]),
  ]);
  const priorities = { high: 0, medium: 1, low: 2 };
  return {
    ...analysis,
    findings: analysis.findings
      .map((item) => ({
        ...item,
        priority: /\boptional\b/i.test(item.title)
          ? ("low" as const)
          : item.priority,
      }))
      .sort((a, b) => priorities[a.priority] - priorities[b.priority]),
  };
}
export function validateMatch(
  analysis: MatchAnalysis,
  resume: string,
  job: string,
): MatchAnalysis {
  if (!analysis.inputsUsable)
    throw new AnalysisInputError(
      "We couldn't identify a resume and actionable job requirements. Include the full qualifications and responsibilities, then try again.",
    );
  checkStrings(analysis);
  if (!analysis.requirements.length || analysis.requirements.length > 20)
    throw new AnalysisValidationError("Invalid requirement count.");
  const titles = new Set<string>();
  for (const requirement of analysis.requirements) {
    requireEvidence(job, requirement.jobEvidence);
    const title = normalized(requirement.title);
    if (titles.has(title))
      throw new AnalysisValidationError("Duplicate requirement.");
    titles.add(title);
    if (requirement.status === "not_evidenced") {
      if (requirement.resumeEvidence !== null)
        throw new AnalysisValidationError("Conflicting evidence status.");
    } else requireEvidence(resume, requirement.resumeEvidence);
    if (requirement.status !== "supported" && !requirement.nextStep)
      throw new AnalysisValidationError("Missing next step.");
  }
  return analysis;
}
export const REQUIREMENT_WEIGHTS = {
  required: 3,
  unspecified: 2,
  preferred: 1,
} as const;
export function requirementCoverage(requirements: Requirement[]) {
  let earned = 0;
  let possible = 0;
  for (const requirement of requirements) {
    const weight = REQUIREMENT_WEIGHTS[requirement.importance];
    possible += weight;
    earned +=
      weight *
      (requirement.status === "supported"
        ? 1
        : requirement.status === "partial"
          ? 0.5
          : 0);
  }
  return {
    percent: possible ? Math.round((100 * earned) / possible) : 0,
    supported: requirements.filter((r) => r.status === "supported").length,
    partial: requirements.filter((r) => r.status === "partial").length,
    notEvidenced: requirements.filter((r) => r.status === "not_evidenced")
      .length,
    total: requirements.length,
  };
}
