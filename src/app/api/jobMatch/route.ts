// app/api/jobMatch/route.ts
import { NextResponse } from 'next/server';
import OpenAI            from 'openai';
import { z }             from 'zod';

/* ------------------------------------------------------------------ */
/* 1 ▸ Zod schema (no hard cap on array length – we’ll trim manually)  */
/* ------------------------------------------------------------------ */
const MatchSchema = z.object({
  matchScore:    z.number().int().min(0).max(100),
  matchedSkills: z.array(z.string().max(160)),   // skills present in résumé
  missingSkills: z.array(z.string().max(160)),   // skills not found
  gaps:          z.array(z.string().max(160)),   // short explanatory sentences
  actions:       z.array(z.string().max(160)),   // concrete fixes (≤160 chars)
});
type MatchResult = z.infer<typeof MatchSchema>;

/* ------------------------------------------------------------------ */
/* 2 ▸ System prompt – returns ONLY JSON that matches the schema       */
/* ------------------------------------------------------------------ */
const PROMPT = `
You are an expert technical recruiter.

Given a JOB DESCRIPTION and a CANDIDATE RESUME, reply **only** with valid JSON:

{
  "matchScore": <integer 0‑100>,
  "matchedSkills": [ skills that appear in both documents ],
  "missingSkills": [ skills required but NOT present in resume ],
  "gaps": [ up to 10 short sentences describing main mis‑matches ],
  "actions": [ up to 15 concrete fixes the candidate should do
               (start with a verb, ≤160 chars) ]
}

Rules:
• No markdown, no commentary outside the JSON block.
• Keep every string concise; max 160 characters.
`.trim();

/* ------------------------------------------------------------------ */
/* 3 ▸ OpenAI client                                                   */
/* ------------------------------------------------------------------ */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ------------------------------------------------------------------ */
/* 4 ▸ POST handler                                                   */
/* ------------------------------------------------------------------ */
export async function POST(req: Request) {
  /* 4‑A ▸ read body -------------------------------------------------- */
  const { resume, job } = await req.json() as { resume?: string; job?: string };

  if (typeof resume !== 'string' || typeof job !== 'string' ||
      !resume.trim() || !job.trim()) {
    return NextResponse.json(
      { error: 'Both resume and job description must be provided.' },
      { status: 400 }
    );
  }

  /* 4‑B ▸ call GPT --------------------------------------------------- */
  let raw = '';
  try {
    const completion = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user',   content: `JOB DESCRIPTION:\n${job}` },
        { role: 'user',   content: `CANDIDATE RESUME:\n${resume}` },
      ],
    });
    raw = completion.choices[0]?.message?.content ?? '';
  } catch (err) {
    console.error('OpenAI error:', err);
    return NextResponse.json({ error: 'OpenAI request failed.' }, { status: 500 });
  }

  /* 4‑C ▸ parse JSON ------------------------------------------------- */
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch {
    console.error('GPT returned non‑JSON:\n', raw);
    return NextResponse.json({ error: 'Invalid JSON from GPT', raw }, { status: 500 });
  }

  /* 4‑D ▸ trim arrays to safe limits before validation --------------- */
  const safe = parsed as any;
  ['matchedSkills', 'missingSkills', 'gaps', 'actions'].forEach((key) => {
    if (Array.isArray(safe[key])) {
      safe[key] = safe[key]
        .slice(0, key === 'actions' ? 15 : 10)      // max items
        .map((s: string) => s.slice(0, 160));       // max length
    }
  });

  /* 4‑E ▸ validate --------------------------------------------------- */
  const validation = MatchSchema.safeParse(safe);
  if (!validation.success) {
    console.error('Schema errors:', validation.error.issues);
    return NextResponse.json(
      { error: 'Schema mismatch', details: validation.error.issues, raw },
      { status: 500 }
    );
  }

  /* 4‑F ▸ success ---------------------------------------------------- */
  const data: MatchResult = validation.data;
  return NextResponse.json(data);
}
