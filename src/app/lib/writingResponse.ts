import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { LengthFinishReasonError } from "openai/error";
import { AnalysisInputError, AnalysisValidationError } from "./analysisV2";
import {
  generateWriting,
  writingInput,
  type WritingKind,
} from "./writingEngine";
export async function writingResponse(req: Request, kind: WritingKind) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const raw = await req.json().catch(() => null);
    const normalized = raw && {
      ...raw,
      resume: raw.resume ?? raw.context,
      job: raw.job ?? raw.jobDesc,
    };
    const input = writingInput.safeParse(normalized);
    if (!input.success)
      return NextResponse.json(
        { error: "Check the document fields and length limits." },
        { status: 400, headers },
      );
    const result = await generateWriting(kind, input.data);
    return NextResponse.json(
      {
        ...result,
        ...(kind === "tailor"
          ? {
              tailoredResume: result.content,
              wordCount: result.content.split(/\s+/).length,
            }
          : {}),
        ...(kind === "letter" ? { coverLetter: result.content } : {}),
        success: true,
      },
      { headers },
    );
  } catch (error) {
    const badInput = error instanceof AnalysisInputError;
    const invalid =
      error instanceof AnalysisValidationError ||
      error instanceof ZodError ||
      error instanceof LengthFinishReasonError;
    return NextResponse.json(
      {
        error: badInput
          ? error.message
          : invalid
            ? "We couldn't verify this draft against your facts. Your allowance has not been used. Add more detail or try again."
            : "Writing is temporarily unavailable. Your allowance has not been used.",
      },
      { status: badInput ? 400 : invalid ? 502 : 503, headers },
    );
  }
}
