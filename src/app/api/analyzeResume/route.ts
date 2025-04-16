// app/api/analyzeResume/route.ts
import { NextResponse } from 'next/server';
import OpenAI          from 'openai';
import { z }           from 'zod';

/* 1. Schema: ONLY score + issues + actions */
const AuditSchema = z.object({
  score:   z.number().int().min(0).max(100),
  issues:  z.array(z.string().min(3)).max(20),
  actions: z.array(z.string().min(3)).max(20),
});
type Audit = z.infer<typeof AuditSchema>;

/* 2. Prompt: one‑line problem, one‑line X‑Y‑Z rewrite */
const PROMPT = `
You are a ruthless résumé auditor.

Return **ONLY** valid JSON:
{
  "score":   <integer 0‑100>,
  "issues":  [ up to 20 items ],
  "actions": [ improved bullets, same count, same order ]
}

Rules
• Each issue is a single sentence naming the exact problem (cite text if helpful).
• Each action is a full rewritten bullet following X‑Y‑Z:
  – Starts with a strong past‑tense verb.  
  – Contains **at least one numeric metric** (%, $, #, x).  
  – Ends with the business/result impact.
• No bullet symbols, no markdown, no extra keys, no trailing dashes.
`.trim();


/* 3. OpenAI client */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* 4. Handler */
export async function POST(req: Request) {
  const { resume } = await req.json();

  if (typeof resume !== 'string' || !resume.trim()) {
    return NextResponse.json({ error: 'Missing resume text' }, { status: 400 });
  }

  /* → ask GPT */
  const gpt = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    temperature: 0.25,
    messages: [
      { role: 'system', content: PROMPT },
      { role: 'user',   content: resume },
    ],
  });

  const raw = gpt.choices[0]?.message?.content ?? '';

  /* → parse JSON */
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch {
    console.error('GPT sent non‑JSON:\n', raw);
    return NextResponse.json({ error: 'Invalid JSON from GPT', raw }, { status: 500 });
  }

  /* → validate */
  const result = AuditSchema.safeParse(parsed);
  if (!result.success) {
    console.error('Schema errors:', result.error.issues);
    return NextResponse.json(
      { error: 'Schema mismatch', details: result.error.issues, raw },
      { status: 500 },
    );
  }

  /* → small post‑clean: trim whitespace / stray dash */
  const clean = (s: string) => s.replace(/\s*[-–—]\s*$/u, '').trim();
  const audit: Audit = {
    score:   result.data.score,
    issues:  result.data.issues.map(clean),
    actions: result.data.actions.map(clean),
  };

  return NextResponse.json(audit);
}
