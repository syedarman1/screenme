// app/api/jobMatch/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { checkUsageLimit, incrementUsage } from '../../lib/usageTracker';

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
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000
});

/* ------------------------------------------------------------------ */
/* 4 ▸ POST handler                                                   */
/* ------------------------------------------------------------------ */
export async function POST(req: Request) {
  try {
    /* 4‑A ▸ read body -------------------------------------------------- */
    const body = await req.json().catch(() => ({}));
    const { resume, job, userId } = body as { resume?: string; job?: string; userId?: string };

    // Validate required inputs
    if (typeof resume !== 'string' || typeof job !== 'string' ||
      !resume.trim() || !job.trim()) {
      return NextResponse.json(
        { error: 'Both resume and job description must be provided.' },
        { status: 400 }
      );
    }

    // Validate minimum content length
    if (resume.trim().length < 100) {
      return NextResponse.json(
        { error: 'Resume must be at least 100 characters long.' },
        { status: 400 }
      );
    }

    if (job.trim().length < 50) {
      return NextResponse.json(
        { error: 'Job description must be at least 50 characters long.' },
        { status: 400 }
      );
    }

    // Check usage limits if user is authenticated
    if (userId) {
      const usageCheck = await checkUsageLimit(userId, 'job_match');
      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Usage limit reached. You\'ve used all job match analyses for this month.',
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
            plan: usageCheck.plan
          },
          { status: 429 }
        );
      }
    }

    /* 4‑B ▸ call GPT --------------------------------------------------- */
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
        throw new Error("OpenAI returned empty response");
      }
    } catch (err: any) {
      console.error('OpenAI error:', err);
      return NextResponse.json({ 
        error: 'OpenAI request failed.',
        message: err.message || "Unknown OpenAI error"
      }, { status: 500 });
    }

    /* 4‑C ▸ parse JSON ------------------------------------------------- */
    let parsed: unknown;
    try { 
      parsed = JSON.parse(raw); 
    } catch (parseError) {
      console.error('GPT returned non‑JSON:\n', raw.substring(0, 500));
      return NextResponse.json({ 
        error: 'Invalid JSON from GPT', 
        raw: raw.substring(0, 500) 
      }, { status: 500 });
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
      return NextResponse.json(
        { 
          error: 'Schema mismatch', 
          details: validation.error.issues, 
          raw: raw.substring(0, 500) 
        },
        { status: 500 }
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
    return NextResponse.json(
      {
        error: "Failed to analyze job match",
        message: error.message || "Unknown error",
        code: error.code || "UNKNOWN_ERROR"
      },
      { status: error.status || 500 }
    );
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