import { z } from "zod";
import {
  scanSchema,
  matchSchema,
  AnalysisValidationError,
  type ScanAnalysis,
  type MatchAnalysis,
} from "./analysisV2";

export type SourcePassage = { id: string; text: string };

// Select evidence by reference, then render the source ourselves. The model
// cannot paraphrase a citation or stitch non-contiguous fragments into a quote.
export function sourcePassages(
  source: string,
  prefix: "R" | "J",
): SourcePassage[] {
  function splitText(text: string, limit = 700): string[] {
    const chunks: string[] = [];
    let remaining = text.trim();
    while (remaining.length > limit) {
      const boundary = remaining.lastIndexOf(" ", limit);
      const end = boundary > limit / 2 ? boundary : limit;
      chunks.push(remaining.slice(0, end));
      remaining = remaining.slice(end).trimStart();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
  }
  let chunks = source.split(/\r?\n/).flatMap((line) => splitText(line));
  // Very fragmented PDF extraction must stay bounded. Slice the original text
  // rather than joining fragments, so every displayed passage is still exact.
  if (chunks.length > 90) chunks = splitText(source, 1800);
  return chunks.map((text, index) => ({ id: `${prefix}${index + 1}`, text }));
}
function originalText(passages: SourcePassage[], reference: string): string {
  const passage = passages.find((item) => item.id === reference);
  if (!passage)
    throw new AnalysisValidationError("Unknown source passage reference.");
  return passage.text;
}
export function resolveScanEvidence(
  analysis: ScanAnalysis,
  passages: SourcePassage[],
): ScanAnalysis {
  // Invalid input has no evidence to resolve; the validator returns the input error.
  if (!analysis.inputsUsable) return analysis;
  const assessment = (item: ScanAnalysis["assessments"]["clarity"]) => ({
    ...item,
    evidence:
      item.evidence === null ? null : originalText(passages, item.evidence),
  });
  return {
    ...analysis,
    assessments: {
      clarity: assessment(analysis.assessments.clarity),
      impact: assessment(analysis.assessments.impact),
      organization: assessment(analysis.assessments.organization),
    },
    findings: analysis.findings.map((item) => ({
      ...item,
      evidence: originalText(passages, item.evidence),
    })),
    strengths: analysis.strengths.map((item) => ({
      ...item,
      evidence: originalText(passages, item.evidence),
    })),
  };
}
export function resolveMatchEvidence(
  analysis: MatchAnalysis,
  resume: SourcePassage[],
  job: SourcePassage[],
): MatchAnalysis {
  if (!analysis.inputsUsable) return analysis;
  return {
    ...analysis,
    requirements: analysis.requirements.map((item) => ({
      ...item,
      nextStep:
        item.status === "supported" && !item.nextStep?.trim()
          ? null
          : item.nextStep,
      jobEvidence: originalText(job, item.jobEvidence),
      resumeEvidence:
        item.resumeEvidence === null
          ? null
          : originalText(resume, item.resumeEvidence),
    })),
  };
}

// Constrain the provider's structured output to the IDs actually supplied.
// A prompt alone cannot reliably prevent quoted text or invented references.
export function sourceSchemas(resume: SourcePassage[], job: SourcePassage[]) {
  const references = (passages: SourcePassage[]) => {
    if (!passages.length)
      throw new AnalysisValidationError("No source passages.");
    return z.enum(passages.map((p) => p.id) as [string, ...string[]]);
  };
  const resumeRef = references(resume);
  const assessment = scanSchema.shape.assessments.shape.clarity.extend({
    evidence: resumeRef.nullable(),
  });
  return {
    scan: scanSchema.extend({
      assessments: z.object({
        clarity: assessment,
        impact: assessment,
        organization: assessment,
      }),
      findings: z.array(
        scanSchema.shape.findings.element.extend({ evidence: resumeRef }),
      ),
      strengths: z.array(
        scanSchema.shape.strengths.element.extend({ evidence: resumeRef }),
      ),
    }),
    match: job.length
      ? matchSchema.extend({
          requirements: z.array(
            matchSchema.shape.requirements.element.extend({
              jobEvidence: references(job),
              resumeEvidence: resumeRef.nullable(),
            }),
          ),
        })
      : null,
  };
}
