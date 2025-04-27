// src/app/api/interviewPrep/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// ─── POST handler ─────────────────────────────────
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Job description is required." },
      { status: 400 }
    );
  }
  const { job, context } = parsed.data as RequestData;

  // Build the prompt messages
  type Msg = Parameters<typeof openai.chat.completions.create>[0]["messages"][number];
  const messages: Msg[] = [
    {
      role: "system",
      content: `You are an expert technical recruiter.
Given a job description (and optional context), generate 5–7 tailored interview questions and model answers.
Return ONLY JSON in the format:
{ "questions": [ { "question": "...", "modelAnswer": "..." }, … ] }`,
    },
    {
      role: "user",
      content: `Job Description:
${job}

Context:
${context ?? ""}`,
    },
  ];

  // Call OpenAI
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

  // Parse & validate JSON response
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

  // Return validated questions
  const data = parsedRes.data as ResponseData;
  return NextResponse.json(data, { status: 200 });
}
