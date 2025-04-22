// app/api/interviewPrep/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

const InterviewPrepSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(10),
        modelAnswer: z.string().min(20),
      })
    )
    .min(5)
    .max(10),
});
type InterviewPrep = z.infer<typeof InterviewPrepSchema>;

const SYSTEM_PROMPT = `
You are a seasoned technical interview coach. 
Given a JOB DESCRIPTION (and optional ROLE/COMPANY context), return **ONLY** valid JSON matching this schema:

{
  "questions": [
    {
      "question": "<a tailored behavioral or technical question>",
      "modelAnswer": "<a concise bullet‑point style model answer>"
    },
    …
  ]
}

Rules:
- Produce between 5 and 10 question/answer pairs.
- Questions should include both behavioral (e.g. teamwork, leadership) and tech (e.g. system design, coding) aspects relevant to the JD.
- Model answers are 2–4 bullet points, each under 120 chars.
- No extra keys or text outside the JSON.
`.trim();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { job, context } = await req.json();
  if (typeof job !== "string" || !job.trim()) {
    return NextResponse.json({ error: "Missing job description" }, { status: 400 });
  }

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `JOB DESCRIPTION:\n${job}` },
  ];
  if (typeof context === "string" && context.trim()) {
    messages.push({ role: "user", content: `ROLE/COMPANY CONTEXT:\n${context}` });
  }

  // Call GPT
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages,
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("Invalid JSON from GPT:", raw);
    return NextResponse.json({ error: "GPT returned invalid JSON", raw }, { status: 500 });
  }

  const result = InterviewPrepSchema.safeParse(parsed);
  if (!result.success) {
    console.error("Schema validation failed:", result.error.issues);
    return NextResponse.json(
      { error: "Schema mismatch", details: result.error.issues, raw },
      { status: 500 }
    );
  }

  return NextResponse.json(result.data as InterviewPrep);
}
