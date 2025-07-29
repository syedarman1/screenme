// app/api/jobMatch/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { checkUsageLimit, incrementUsage } from '../../lib/usageTracker';
import { ErrorTypes, handleAPIError, validateRequest, validateContentLength } from '../../lib/errorHandler';

/* ------------------------------------------------------------------ */
/* 1 ▸ Zod schema (no hard cap on array length – we'll trim manually)  */
/* ------------------------------------------------------------------ */
const MatchSchema = z.object({
  matchScore: z.number().int().min(0).max(100),
  matchedSkills: z.array(z.string().max(160)),   // skills present in résumé
  missingSkills: z.array(z.string().max(160)),   // skills not found
  gaps: z.array(z.string().max(160)),   // short explanatory sentences
  actions: z.array(z.string().max(160)),   // concrete fixes (≤160 chars)
});
type MatchResult = z.infer<typeof MatchSchema>;

/* ------------------------------------------------------------------ */
/* 2 ▸ System prompt – returns ONLY JSON that matches the schema       */
/* ------------------------------------------------------------------ */
const PROMPT = `
You are an expert technical recruiter.

Given a JOB DESCRIPTION and a CANDIDATE RESUME, reply **only** with valid JSON:

{
  "matchScore": <integer 0‑100>,
  "matchedSkills": [ skills that appear in both documents ],
  "missingSkills": [ skills required but NOT present in resume ],
  "gaps": [ up to 10 short sentences describing main mis‑matches ],
  "actions": [ up to 15 concrete fixes the candidate should do
               (start with a verb, ≤160 chars) ]
}

Rules:
• No markdown, no commentary outside the JSON block.
• Keep every string concise; max 160 characters.
• Focus on technical skills, experience level, and role requirements.
• Be specific about what's missing and what actions would improve the match.
• matchScore should reflect overall alignment (0-39: poor, 40-69: fair, 70-89: good, 90-100: excellent).
`.trim();

/* ------------------------------------------------------------------ */
/* 3 ▸ OpenAI client                                                   */
/* ------------------------------------------------------------------ */
// Only create OpenAI client if API key is available
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000
  })
  : null;

/* ------------------------------------------------------------------ */
/* 4 ▸ POST handler                                                   */
/* ------------------------------------------------------------------ */
export async function POST(req: Request) {
  try {
    /* 4‑A ▸ read body -------------------------------------------------- */
    const body = await req.json().catch(() => ({}));
    const { resume, job, userId } = body as { resume?: string; job?: string; userId?: string };

    // Validate required fields
    const validationError = validateRequest(body, ['resume', 'job']);
    if (validationError) {
      return handleAPIError(validationError);
    }

    // Validate resume content length with specific guidance
    const resumeError = validateContentLength(
      resume,
      'Resume',
      100,
      'Include your work experience, skills, and key achievements for accurate job matching.'
    );
    if (resumeError) {
      return handleAPIError(resumeError);
    }

    // Validate job description content length
    const jobError = validateContentLength(
      job,
      'Job description',
      50,
      'Paste the complete job posting including requirements, responsibilities, and qualifications.'
    );
    if (jobError) {
      return handleAPIError(jobError);
    }

    // Check usage limits if user is authenticated
    if (userId) {
      const usageCheck = await checkUsageLimit(userId, 'job_match');
      if (!usageCheck.allowed) {
        const usageError = ErrorTypes.USAGE_LIMIT_REACHED('job match analyses', usageCheck.plan);
        return NextResponse.json(
          {
            error: usageError.message,
            details: {
              message: usageError.message,
              code: usageError.code,
              action: usageError.action,
              limit: usageCheck.limit,
              remaining: usageCheck.remaining,
              plan: usageCheck.plan
            },
            timestamp: new Date().toISOString()
          },
          { status: usageError.status }
        );
      }
    }

    /* 4‑B ▸ call GPT --------------------------------------------------- */
    if (!openai) {
      const serviceError = ErrorTypes.OPENAI_SERVICE_ERROR();
      return NextResponse.json(
        {
          error: 'AI job matching service is not configured. Please contact support.',
          details: {
            message: serviceError.message,
            code: serviceError.code,
            action: serviceError.action
          },
          timestamp: new Date().toISOString()
        },
        { status: serviceError.status }
      );
    }

    let raw = '';
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: `JOB DESCRIPTION:\n${job.trim()}` },
          { role: 'user', content: `CANDIDATE RESUME:\n${resume.trim()}` },
        ],
      });
      raw = completion.choices[0]?.message?.content ?? '';

      if (!raw) {
        throw ErrorTypes.OPENAI_SERVICE_ERROR();
      }
    } catch (err: any) {
      console.error('OpenAI error:', err);

      // Check for specific OpenAI error types
      if (err.message?.includes('rate limit') || err.message?.includes('quota')) {
        return NextResponse.json(
          {
            error: 'Job matching temporarily unavailable due to high demand. Please try again in a few minutes.',
            details: {
              message: 'Service temporarily overloaded',
              code: 'OPENAI_RATE_LIMITED',
              action: 'Wait 2-3 minutes and try analyzing your job match again.'
            },
            timestamp: new Date().toISOString()
          },
          { status: 503 }
        );
      }

      const serviceError = ErrorTypes.OPENAI_SERVICE_ERROR();
      return handleAPIError(serviceError);
    }

    /* 4‑C ▸ parse JSON ------------------------------------------------- */
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.error('GPT returned non‑JSON:\n', raw.substring(0, 500));
      const formatError = ErrorTypes.INVALID_RESPONSE_FORMAT();
      return NextResponse.json(
        {
          error: formatError.message,
          details: {
            message: formatError.message,
            code: formatError.code,
            action: formatError.action,
            raw: raw.substring(0, 200)
          },
          timestamp: new Date().toISOString()
        },
        { status: formatError.status }
      );
    }

    /* 4‑D ▸ trim arrays to safe limits before validation --------------- */
    const safe = parsed as any;
    ['matchedSkills', 'missingSkills', 'gaps', 'actions'].forEach((key) => {
      if (Array.isArray(safe[key])) {
        safe[key] = safe[key]
          .slice(0, key === 'actions' ? 15 : 10)      // max items
          .map((s: string) => String(s).slice(0, 160));       // max length
      }
    });

    /* 4‑E ▸ validate --------------------------------------------------- */
    const validation = MatchSchema.safeParse(safe);
    if (!validation.success) {
      console.error('Schema errors:', validation.error.issues);
      const formatError = ErrorTypes.INVALID_RESPONSE_FORMAT();
      return NextResponse.json(
        {
          error: formatError.message,
          details: {
            message: formatError.message,
            code: formatError.code,
            action: formatError.action,
            validationErrors: validation.error.issues,
            raw: raw.substring(0, 200)
          },
          timestamp: new Date().toISOString()
        },
        { status: formatError.status }
      );
    }

    /* 4‑F ▸ success ---------------------------------------------------- */
    const data: MatchResult = validation.data;

    // Increment usage AFTER successful processing
    if (userId) {
      const incrementSuccess = await incrementUsage(userId, 'job_match');
      if (!incrementSuccess) {
        console.warn("Failed to increment usage for user:", userId);
        // Don't fail the request, just log the warning
      }
    }

    return NextResponse.json({
      ...data,
      success: true
    }, {
      headers: {
        'Cache-Control': 'private, max-age=1800', // 30 minutes
      }
    });

  } catch (error: any) {
    console.error("Error processing job match:", error);
    return handleAPIError(error);
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}