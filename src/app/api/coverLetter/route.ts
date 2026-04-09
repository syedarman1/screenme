// app/api/coverLetter/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { checkUsageLimit, incrementUsage } from "../../lib/usageTracker";
import { ErrorTypes, handleAPIError, validateRequest, validateContentLength } from "../../lib/errorHandler";

/* ── Tone instructions ────────────────────────────────────── */
const toneInstructions: Record<string, { instruction: string; temp: number; wordTarget: string }> = {
  Professional: {
    temp: 0.65,
    wordTarget: "320-380 words",
    instruction: `Tone: Formal and achievement-focused. Use precise language, active voice, and confident statements. No contractions. Measured enthusiasm. Lead with a clear value proposition.`,
  },
  Enthusiastic: {
    temp: 0.82,
    wordTarget: "320-380 words",
    instruction: `Tone: Energetic and genuinely passionate. Open with a specific hook about why this company/role is exciting — reference something real about the company. Let personality come through while staying professional. Use dynamic verbs.`,
  },
  Concise: {
    temp: 0.4,
    wordTarget: "180-230 words",
    instruction: `Tone: Direct and punchy. Every sentence earns its place — cut anything vague or generic. Short paragraphs (2-3 sentences max). Lead with impact. Skip pleasantries. Make the ask unmistakable.`,
  },
  Formal: {
    temp: 0.55,
    wordTarget: "340-400 words",
    instruction: `Tone: Highly formal — appropriate for government, legal, academic, or executive roles. Use complete titles and formal language. Structured and methodical. Emphasize credentials, tenure, and institutional alignment. No colloquialisms.`,
  },
  Creative: {
    temp: 0.9,
    wordTarget: "300-360 words",
    instruction: `Tone: Narrative-led and memorable. Open with a short story or unexpected angle that connects the candidate's experience to the company's mission. Keep it professional but dare to be distinct. Show — don't tell — the candidate's personality and impact.`,
  },
};

const buildPrompt = (tone: string) => {
  const { instruction, wordTarget } = toneInstructions[tone] ?? toneInstructions["Professional"];
  return `
You are an expert career coach and professional ghostwriter. You write cover letters that actually get interviews.

${instruction}

Letter structure:
1. Opening paragraph — Hook that shows genuine knowledge of the company + why this specific role excites this specific candidate.
2. Body paragraph 1 — 2-3 concrete accomplishments from the resume with measurable impact (numbers, %, scale, outcomes).
3. Body paragraph 2 — How the candidate's unique background directly solves the company's needs for this role.
4. Closing paragraph — Forward-looking call to action. Confident but not arrogant.

Hard rules:
- Open with "Dear Hiring Manager," — never "To Whom It May Concern"
- Close with "Sincerely," followed by a blank line (no placeholder like [Your Name])
- NO address blocks, headers, or dates — body only from salutation to signature
- DO NOT repeat the resume verbatim — transform experience into a compelling narrative
- DO NOT use placeholder text like [Company Name] or [Your Name]
- DO NOT mention the tone style in the letter itself
- Target length: ${wordTarget}
- Use the actual company name and job title provided — make it feel written for this exact role
`.trim();
};

/* ── OpenAI client ────────────────────────────────────────── */
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 35000 })
  : null;

const VALID_TONES = Object.keys(toneInstructions);

/* ── POST ─────────────────────────────────────────────────── */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { resume, jobTitle, company, jobDesc, tone, userId } = body;

    const validationError = validateRequest(body, ["resume", "jobTitle", "company", "tone"]);
    if (validationError) return handleAPIError(validationError);

    const contentError = validateContentLength(resume, "Resume", 100,
      "Include key experiences, skills, and achievements to create a compelling cover letter.");
    if (contentError) return handleAPIError(contentError);

    if (String(jobTitle).trim().length < 3) {
      return handleAPIError(ErrorTypes.CONTENT_TOO_SHORT("Job title", 3, 'Enter the full job title (e.g., "Senior Software Engineer").'));
    }
    if (String(company).trim().length < 2) {
      return handleAPIError(ErrorTypes.CONTENT_TOO_SHORT("Company name", 2, "Enter the full company name."));
    }

    const validTone = VALID_TONES.includes(tone) ? tone : "Professional";

    // Free users get Professional only
    const isPro = userId ? true : false; // usage tracker handles plan enforcement — tone enforcement is on the client
    const effectiveTone = isPro ? validTone : "Professional";

    if (userId) {
      const usageCheck = await checkUsageLimit(userId, "cover_letter");
      if (!usageCheck.allowed) {
        const usageError = ErrorTypes.USAGE_LIMIT_REACHED("cover letters", usageCheck.plan);
        return NextResponse.json(
          { error: usageError.message, details: { message: usageError.message, code: usageError.code, action: usageError.action, limit: usageCheck.limit, remaining: usageCheck.remaining, plan: usageCheck.plan }, timestamp: new Date().toISOString() },
          { status: usageError.status }
        );
      }
    }

    if (!openai) {
      return NextResponse.json(
        { error: "AI cover letter service is not configured. Please contact support.", timestamp: new Date().toISOString() },
        { status: 503 }
      );
    }

    const userContent = `
CANDIDATE RESUME:
${String(resume).trim()}

TARGET ROLE: ${String(jobTitle).trim()} at ${String(company).trim()}
${jobDesc?.trim() ? `\nJOB DESCRIPTION:\n${String(jobDesc).trim()}` : ""}
`.trim();

    let coverLetter: string;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: toneInstructions[effectiveTone].temp,
        max_tokens: 1400,
        messages: [
          { role: "system", content: buildPrompt(effectiveTone) },
          { role: "user", content: userContent },
        ],
      });

      coverLetter = completion.choices[0].message?.content?.trim() ?? "";
      if (!coverLetter) throw ErrorTypes.OPENAI_SERVICE_ERROR();

      // Sanity checks on output quality
      if (coverLetter.length < 200) throw new Error("Generated letter was too short. Please try again.");
      if (coverLetter.includes("{{") || coverLetter.includes("[Your Name]") || coverLetter.includes("[Company")) {
        // Strip leftover placeholders
        coverLetter = coverLetter
          .replace(/\[Your Name\]/g, "")
          .replace(/\[Company[^\]]*\]/g, String(company).trim())
          .replace(/\{\{[^}]*\}\}/g, "")
          .trim();
      }
    } catch (err: any) {
      console.error("OpenAI error:", err);
      if (err.message?.includes("rate limit") || err.message?.includes("quota")) {
        return NextResponse.json({ error: "Cover letter generation temporarily unavailable. Please try again in a few minutes." }, { status: 503 });
      }
      if (err.message?.startsWith("Generated letter")) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
      return handleAPIError(ErrorTypes.OPENAI_SERVICE_ERROR());
    }

    if (userId) {
      const ok = await incrementUsage(userId, "cover_letter");
      if (!ok) console.warn("Failed to increment usage for user:", userId);
    }

    const wordCount = coverLetter.split(/\s+/).filter(Boolean).length;

    return NextResponse.json(
      { coverLetter, wordCount, tone: effectiveTone, success: true },
      { headers: { "Cache-Control": "private, max-age=1800" } }
    );
  } catch (error: any) {
    console.error("Error processing cover letter request:", error);
    return handleAPIError(error);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
