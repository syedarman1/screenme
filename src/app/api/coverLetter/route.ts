// app/api/coverLetter/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

const InputSchema = z.object({
  resume: z.string().min(1),
  jobDesc: z.string().min(1),
  hook: z.string().optional(),
});
type Input = z.infer<typeof InputSchema>;

const OutputSchema = z.object({
  coverLetter: z.string().min(1),
});
type Output = z.infer<typeof OutputSchema>;

const SYSTEM_PROMPT = `
You are an expert cover-letter writer. Given the candidate's résumé text, a job description, and an optional personal hook, produce a concise, 3-paragraph cover letter:

1) Opening: Address the hiring manager, mention the role & hook.
2) Body: Highlight 2–3 achievements from the résumé that map to the JD.
3) Closing: Express enthusiasm & call to action.

Return ONLY valid JSON:
{"coverLetter":"Dear …\\n\\n…\\n\\nSincerely, …"}
`.trim();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const json = await req.json();
  const inParse = InputSchema.safeParse(json);
  if (!inParse.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const { resume, jobDesc, hook } = inParse.data;

  // build a strongly-typed message array
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: `RÉSUMÉ:\n${resume}` },
    { role: 'user' as const, content: `JOB DESCRIPTION:\n${jobDesc}` },
  ];

  if (hook) {
    messages.push({ role: 'user' as const, content: `PERSONAL HOOK:\n${hook}` });
  }

  let raw: string;
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages,
    });
    raw = resp.choices[0]?.message?.content ?? '';
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'OpenAI request failed' }, { status: 500 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('Non-JSON from AI:', raw);
    return NextResponse.json({ error: 'Invalid JSON from AI', raw }, { status: 500 });
  }

  const outParse = OutputSchema.safeParse(parsed);
  if (!outParse.success) {
    console.error('Output schema mismatch:', outParse.error);
    return NextResponse.json({ error: 'AI output mismatch', raw }, { status: 500 });
  }

  return NextResponse.json(outParse.data);
}
