// src/app/api/tailorResume/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { checkUsageLimit, incrementUsage } from "../../lib/usageTracker";
import { ErrorTypes, handleAPIError } from "../../lib/errorHandler";
import { getAuthenticatedUser, unauthorized } from "../../lib/auth";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45000 })
  : null;

export async function POST(req: NextRequest) {
  if (!openai) return NextResponse.json({ error: "AI service not configured." }, { status: 503 });

  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  const userId = user.id;

  const body = await req.json().catch(() => ({}));
  const { resume, job } = body as { resume?: string; job?: string };

  if (!resume || typeof resume !== "string" || resume.trim().length < 50)
    return NextResponse.json({ error: "Resume must be at least 50 characters." }, { status: 400 });
  if (!job || typeof job !== "string" || job.trim().length < 30)
    return NextResponse.json({ error: "Job description must be at least 30 characters." }, { status: 400 });

  /* ── Usage limit check ── */
  const usageCheck = await checkUsageLimit(userId, "resume_tailor");
  if (!usageCheck.allowed) {
    const usageError = ErrorTypes.USAGE_LIMIT_REACHED("resume tailors", usageCheck.plan);
    return NextResponse.json(
      { error: usageError.message, details: { code: usageError.code, action: usageError.action, limit: usageCheck.limit, remaining: usageCheck.remaining, plan: usageCheck.plan } },
      { status: usageError.status }
    );
  }

  const systemPrompt = `You are an expert resume writer and ATS optimization specialist.

Given the candidate's current resume and a target job description, rewrite the resume to maximize ATS compatibility and relevance for this specific role.

Rules:
1. PRESERVE all factual information — do not invent experience, skills, or achievements the candidate doesn't have
2. Reorder sections and bullet points to prioritize what's most relevant to the target role
3. Mirror keywords and phrases from the job description naturally throughout the resume
4. Strengthen weak bullet points with action verbs and quantified results where the original implies them
5. Remove or de-emphasize irrelevant experience that doesn't support this application
6. Keep the same overall structure (sections, formatting markers) so it's easy to paste back into a template
7. Add a tailored professional summary at the top (2-3 sentences) specific to this role
8. Output ONLY the rewritten resume text — no commentary, no explanations, no markdown headers

The output should be ready to paste directly into a resume template.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `CURRENT RESUME:\n${resume.trim().slice(0, 15000)}\n\nTARGET JOB DESCRIPTION:\n${job.trim().slice(0, 5000)}` },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });

    const tailored = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!tailored || tailored.length < 100) {
      return NextResponse.json({ error: "Failed to generate tailored resume. Please try again." }, { status: 500 });
    }

    /* ── Increment usage ── */
    const ok = await incrementUsage(userId, "resume_tailor");
    if (!ok) console.warn("Failed to increment usage for user:", userId);

    return NextResponse.json({
      tailoredResume: tailored,
      wordCount: tailored.split(/\s+/).filter(Boolean).length,
      success: true,
    });
  } catch (error: any) {
    console.error("Tailor resume error:", error);
    if (error.message?.includes("rate limit") || error.message?.includes("quota")) {
      return NextResponse.json({ error: "Service temporarily unavailable. Please try again shortly." }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to tailor resume. Please try again." }, { status: 500 });
  }
}
