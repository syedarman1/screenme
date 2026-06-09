// app/api/jobMatch/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { checkUsageLimit, incrementUsage } from '../../lib/usageTracker';
import { ErrorTypes, handleAPIError, validateRequest, validateContentLength } from '../../lib/errorHandler';
import { getAuthenticatedUser, unauthorized } from '../../lib/auth';

/* ── Schema ───────────────────────────────────────────────── */
const MatchSchema = z.object({
  matchScore:    z.number().int().min(0).max(100),
  summary:       z.string().max(400).optional(),
  matchedSkills: z.array(z.string().max(160)),
  missingSkills: z.array(z.string().max(160)),
  gaps:          z.array(z.string().max(200)),
  actions:       z.array(z.string().max(200)),
});
type MatchResult = z.infer<typeof MatchSchema>;

/* ── System prompt ────────────────────────────────────────── */
const PROMPT = `
You are a senior technical recruiter with 15+ years of experience matching candidates to roles.

Given a JOB DESCRIPTION and a CANDIDATE RESUME, reply ONLY with valid JSON:

{
  "matchScore": <integer 0-100>,
  "summary": "<1-2 sentence plain-English verdict on this specific candidate for this specific role>",
  "matchedSkills": [ skills/tools/technologies present in BOTH documents ],
  "missingSkills": [ skills/tools required by the JD but absent from the resume ],
  "gaps": [ up to 8 specific gap descriptions — compare exact JD requirement vs candidate profile ],
  "actions": [ up to 12 concrete resume edits — name the section, what to change, and why ]
}

Scoring:
• 90-100: Near-perfect match, candidate exceeds requirements
• 70-89:  Strong match, minor gaps in nice-to-haves
• 50-69:  Decent match, some key requirements missing
• 30-49:  Partial match, several important gaps
• 0-29:   Significant mismatch, fundamental requirements absent

Summary rules:
✓ "Strong match — your 3 years of React experience and AWS background align well with the core requirements, though the role asks for GraphQL which isn't on your resume."
✓ "Partial match — you cover the frontend stack but the JD requires 5+ years of Python ML experience which is missing."
✗ "Good resume."

Gap rules (specific, not generic):
✓ "JD requires 5+ years Python; resume shows ~2 years based on project dates"
✓ "Role needs AWS certification; resume mentions AWS but no cert listed"
✗ "Candidate lacks experience"

Action rules (verb + section + specific change):
✓ "Add 'GraphQL' to your Skills section if you have any exposure — even self-taught projects count"
✓ "Rewrite the Google internship bullet to quantify impact: add users affected, latency improved, or revenue influenced"
✗ "Improve your resume"
✗ "Add more skills"

No markdown. Every string max 200 characters.
`.trim();

/* ── OpenAI client ────────────────────────────────────────── */
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30000 })
  : null;

/* ── POST ─────────────────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorized();
    const userId = user.id;

    const body = await req.json().catch(() => ({}));
    const { resume, job } = body as { resume?: string; job?: string };

    const validationError = validateRequest(body, ['resume', 'job']);
    if (validationError) return handleAPIError(validationError);

    const resumeError = validateContentLength(resume!, 'Resume', 100,
      'Include your work experience, skills, and key achievements for accurate job matching.');
    if (resumeError) return handleAPIError(resumeError);

    const jobError = validateContentLength(job!, 'Job description', 50,
      'Paste the complete job posting including requirements, responsibilities, and qualifications.');
    if (jobError) return handleAPIError(jobError);

    const usageCheck = await checkUsageLimit(userId, 'job_match');
    if (!usageCheck.allowed) {
      const usageError = ErrorTypes.USAGE_LIMIT_REACHED('job match analyses', usageCheck.plan);
      return NextResponse.json(
        { error: usageError.message, details: { message: usageError.message, code: usageError.code, action: usageError.action, limit: usageCheck.limit, remaining: usageCheck.remaining, plan: usageCheck.plan }, timestamp: new Date().toISOString() },
        { status: usageError.status }
      );
    }

    if (!openai) {
      return NextResponse.json(
        { error: 'AI job matching service is not configured. Please contact support.', timestamp: new Date().toISOString() },
        { status: 503 }
      );
    }

    /* ── Call GPT ─────────────────────────────────────────── */
    let raw = '';
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 1800,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: `JOB DESCRIPTION:\n${job!.trim()}` },
          { role: 'user', content: `CANDIDATE RESUME:\n${resume!.trim()}` },
        ],
      });
      raw = completion.choices[0]?.message?.content ?? '';
      if (!raw) throw ErrorTypes.OPENAI_SERVICE_ERROR();
    } catch (err: any) {
      console.error('OpenAI error:', err);
      if (err.message?.includes('rate limit') || err.message?.includes('quota')) {
        return NextResponse.json(
          { error: 'Job matching temporarily unavailable due to high demand. Please try again in a few minutes.', timestamp: new Date().toISOString() },
          { status: 503 }
        );
      }
      return handleAPIError(ErrorTypes.OPENAI_SERVICE_ERROR());
    }

    /* ── Parse ────────────────────────────────────────────── */
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('GPT returned non-JSON:', raw.substring(0, 500));
      return handleAPIError(ErrorTypes.INVALID_RESPONSE_FORMAT());
    }

    /* ── Sanitize before validation ───────────────────────── */
    const safe = parsed as any;
    const clampStr = (s: any, max = 200) => typeof s === 'string' ? s.slice(0, max) : String(s ?? '').slice(0, max);

    if (Array.isArray(safe?.matchedSkills)) {
      safe.matchedSkills = safe.matchedSkills
        .filter((s: any) => s != null)
        .slice(0, 20)
        .map((s: any) => clampStr(s, 160));
    } else { safe.matchedSkills = []; }

    if (Array.isArray(safe?.missingSkills)) {
      safe.missingSkills = safe.missingSkills
        .filter((s: any) => s != null)
        .slice(0, 20)
        .map((s: any) => clampStr(s, 160));
    } else { safe.missingSkills = []; }

    if (Array.isArray(safe?.gaps)) {
      safe.gaps = safe.gaps
        .filter((s: any) => s != null)
        .slice(0, 10)
        .map((s: any) => clampStr(s, 200));
    } else { safe.gaps = []; }

    if (Array.isArray(safe?.actions)) {
      safe.actions = safe.actions
        .filter((s: any) => s != null)
        .slice(0, 15)
        .map((s: any) => clampStr(s, 200));
    } else { safe.actions = []; }

    if (typeof safe?.summary === 'string') {
      safe.summary = safe.summary.slice(0, 400);
    } else {
      delete safe.summary;
    }

    /* ── Validate ─────────────────────────────────────────── */
    const validation = MatchSchema.safeParse(safe);
    if (!validation.success) {
      console.error('Schema errors:', validation.error.issues);
      return handleAPIError(ErrorTypes.INVALID_RESPONSE_FORMAT());
    }

    /* ── Increment usage + respond ────────────────────────── */
    const ok = await incrementUsage(userId, 'job_match');
    if (!ok) console.warn('Failed to increment usage for user:', userId);

    const data: MatchResult = validation.data;
    return NextResponse.json({ ...data, success: true }, {
      headers: { 'Cache-Control': 'private, max-age=1800' },
    });

  } catch (error: any) {
    console.error('Error processing job match:', error);
    return handleAPIError(error);
  }
}

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
