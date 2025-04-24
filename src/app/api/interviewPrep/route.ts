// src/app/api/interviewPrep/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── Schemas ─────────────────────────────────────
const RequestSchema = z.object({
  job:     z.string().min(1),
  context: z.string().optional(),
});
type RequestData = z.infer<typeof RequestSchema>;

const Question = z.object({
  question:    z.string(),
  modelAnswer: z.string(),
});
const ResponseSchema = z.object({
  questions: z.array(Question).min(1),
});
type ResponseData = z.infer<typeof ResponseSchema>;

// ─── Handler ─────────────────────────────────────
export async function POST(req: Request) {
  // 1) parse & validate input
  const body = await req.json();
  const parsedReq = RequestSchema.safeParse(body);
  if (!parsedReq.success) {
    return NextResponse.json(
      { error: "Job description is required." },
      { status: 400 }
    );
  }
  const { job, context } = parsedReq.data as RequestData;

  // 2) build messages array using the exact param type
  type Msg =
    Parameters<typeof openai.chat.completions.create>[0]["messages"][number];

  const messages: Msg[] = [
    {
      role:    "system",
      content: `You are an expert technical recruiter.
Given a job description (and optional context), generate 5–7 tailored interview questions and model answers.
Return ONLY JSON in the format:
{ "questions": [ { "question": "...", "modelAnswer": "..." }, ... ] }`,
    },
    {
      role:    "user",
      content: `Job Description:
${job}

Context:
${context ?? ""}`,
    },
  ];

  // 3) call the API
  let raw: string;
  try {
    const chat = await openai.chat.completions.create({
      model:       "gpt-4",
      temperature: 0.7,
      messages,
    });
    raw = chat.choices[0]?.message?.content ?? "";
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "AI request failed" },
      { status: 500 }
    );
  }

  // 4) parse & validate the response
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "AI returned invalid JSON", raw },
      { status: 500 }
    );
  }

  const parsedRes = ResponseSchema.safeParse(json);
  if (!parsedRes.success) {
    return NextResponse.json(
      {
        error:   "Unexpected response format",
        details: parsedRes.error.issues,
        raw,
      },
      { status: 500 }
    );
  }

  // 5) return well‐typed data
  const data = parsedRes.data as ResponseData;
  return NextResponse.json(data);
}
