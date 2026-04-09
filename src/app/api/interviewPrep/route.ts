// src/app/api/interviewPrep/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { checkUsageLimit, incrementUsage } from "../../lib/usageTracker";
import { ErrorTypes, handleAPIError } from "../../lib/errorHandler";

type ChatMsg = { id: number; who: "user" | "ai"; text: string };

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 35000 })
  : null;

/* ── Router ───────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json"))   return handleQAGeneration(req);
    if (contentType.includes("multipart/form-data")) return handleAudioChat(req);
    return NextResponse.json({ error: "Unsupported content type." }, { status: 400 });
  } catch (e: any) {
    return handleAPIError(e);
  }
}

/* ══════════════════════════════════════════════════════════
   Q&A GENERATION
   ══════════════════════════════════════════════════════════ */
async function handleQAGeneration(req: NextRequest) {
  if (!openai) return NextResponse.json({ error: "AI service not configured." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const { job, context, userId } = body as { job?: string; context?: string; userId?: string };

  /* ── Validate input ─────────────────────────────────────── */
  if (!job || typeof job !== "string" || job.trim().length < 20) {
    return NextResponse.json(
      { error: "Job description must be at least 20 characters.", details: { code: "INVALID_JOB_DESCRIPTION", action: "Paste the complete job posting including requirements and responsibilities." } },
      { status: 400 }
    );
  }

  /* ── Usage limit check ──────────────────────────────────── */
  if (userId) {
    const usageCheck = await checkUsageLimit(userId, "interview_prep");
    if (!usageCheck.allowed) {
      const usageError = ErrorTypes.USAGE_LIMIT_REACHED("interview prep sessions", usageCheck.plan);
      return NextResponse.json(
        { error: usageError.message, details: { message: usageError.message, code: usageError.code, action: usageError.action, limit: usageCheck.limit, remaining: usageCheck.remaining, plan: usageCheck.plan } },
        { status: usageError.status }
      );
    }
  }

  /* ── System prompt ──────────────────────────────────────── */
  const systemPrompt = `You are a senior hiring manager and interview coach with 15+ years of experience.

Generate exactly 6 targeted interview questions for the given role. Cover all 6 types — one each.

Question types (use exactly these strings):
1. "Behavioral"     — "Tell me about a time when…" (past experience, STAR format)
2. "Technical"      — Specific tools, technologies, or domain knowledge required for this role
3. "Situational"    — "What would you do if…" (hypothetical scenario relevant to the role)
4. "Problem-Solving"— Analytical thinking, process, or methodology
5. "Motivation"     — Why this role/company, career direction, values alignment
6. "Role-Specific"  — A unique question about the exact responsibilities or challenges of THIS position

For every question provide:
- question: clear, specific to this role — never generic
- type: one of the exact strings above
- difficulty: "Easy" | "Medium" | "Hard"
- modelAnswer: 4-8 sentences. For Behavioral type, use STAR format explicitly. Reference context from the JD.
- tip: 1-2 sentences of specific interview advice for this question

Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "...",
      "type": "Behavioral",
      "difficulty": "Medium",
      "modelAnswer": "...",
      "tip": "..."
    }
  ]
}

Rules:
- Exactly 6 questions, one of each type
- Questions must be specific to the role — not generic interview questions
- Model answers should be concrete and demonstrate strong performance
- No markdown outside the JSON`;

  const hasResume = typeof context === "string" && context.trim().length > 0;
  const userContent = `JOB DESCRIPTION:\n${job.trim()}${hasResume ? `\n\nCANDIDATE CONTEXT:\n${context!.trim()}` : ""}`;

  /* ── Call GPT ───────────────────────────────────────────── */
  let result: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.6,
      max_tokens: 3500,
      response_format: { type: "json_object" },
    });
    result = completion.choices[0]?.message?.content ?? "";
    if (!result) throw ErrorTypes.OPENAI_SERVICE_ERROR();
  } catch (error: any) {
    console.error("Q&A generation error:", error);
    if (error.message?.includes("rate limit") || error.message?.includes("quota")) {
      return NextResponse.json({ error: "Interview question generation temporarily unavailable. Please try again shortly." }, { status: 503 });
    }
    return handleAPIError(ErrorTypes.OPENAI_SERVICE_ERROR());
  }

  /* ── Parse & sanitize ───────────────────────────────────── */
  let parsed: any;
  try {
    parsed = JSON.parse(result);
  } catch {
    console.error("GPT returned non-JSON:", result.substring(0, 500));
    return handleAPIError(ErrorTypes.INVALID_RESPONSE_FORMAT());
  }

  if (!parsed?.questions || !Array.isArray(parsed.questions)) {
    return handleAPIError(ErrorTypes.INVALID_RESPONSE_FORMAT());
  }

  const VALID_TYPES = ["Behavioral", "Technical", "Situational", "Problem-Solving", "Motivation", "Role-Specific"];
  const VALID_DIFFS = ["Easy", "Medium", "Hard"];

  const questions = parsed.questions
    .filter((q: any) => q && typeof q.question === "string" && q.question.trim().length > 0)
    .slice(0, 6)
    .map((q: any) => ({
      question:    String(q.question   || "").slice(0, 300),
      type:        VALID_TYPES.includes(q.type) ? q.type : "Role-Specific",
      difficulty:  VALID_DIFFS.includes(q.difficulty) ? q.difficulty : "Medium",
      modelAnswer: String(q.modelAnswer || "").slice(0, 1500),
      tip:         String(q.tip        || "").slice(0, 300),
    }));

  if (questions.length === 0) {
    return handleAPIError(ErrorTypes.INVALID_RESPONSE_FORMAT());
  }

  /* ── Increment usage ────────────────────────────────────── */
  if (userId) {
    const ok = await incrementUsage(userId, "interview_prep");
    if (!ok) console.warn("Failed to increment usage for user:", userId);
  }

  return NextResponse.json({ questions }, {
    headers: { "Cache-Control": "private, max-age=1800" },
  });
}

/* ══════════════════════════════════════════════════════════
   AUDIO CHAT (Live Mock Interview)
   ══════════════════════════════════════════════════════════ */
async function handleAudioChat(req: NextRequest) {
  if (!openai) return NextResponse.json({ error: "AI service not configured." }, { status: 503 });

  const form = await req.formData();
  const audioEntry = form.get("audio");

  if (!(audioEntry instanceof File)) {
    return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
  }
  if (audioEntry.size === 0) {
    return NextResponse.json({ error: "No audio detected. Please record your voice and try again." }, { status: 400 });
  }
  if (audioEntry.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Recording too long. Please keep responses under 20 minutes." }, { status: 413 });
  }

  const historyStr  = form.get("history");
  const jobContext  = form.get("jobContext");  // optional: job description / role for context

  if (typeof historyStr !== "string") {
    return NextResponse.json({ error: "Chat history is required." }, { status: 400 });
  }

  let history: ChatMsg[] = [];
  try {
    history = JSON.parse(historyStr);
    if (!Array.isArray(history)) throw new Error();
  } catch {
    return NextResponse.json({ error: "Invalid conversation format. Refresh the page to restart." }, { status: 400 });
  }

  // Cap history to last 8 exchanges to prevent token overflow
  const cappedHistory = history.slice(-8);

  /* ── Transcribe audio ───────────────────────────────────── */
  let transcript = "";
  try {
    const whisperResponse = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioEntry,
      language: "en",
      temperature: 0.2,
    });
    transcript = whisperResponse.text?.trim() ?? "";
    if (!transcript || transcript.length < 2) {
      return NextResponse.json({
        error: "Could not understand your audio. Please speak clearly and try again.",
        transcript: "",
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Whisper error:", error);
    return NextResponse.json({ error: "Audio transcription failed. Check your microphone and try again." }, { status: 500 });
  }

  /* ── Build interviewer reply ────────────────────────────── */
  const updatedHistory = [...cappedHistory, { id: Date.now(), who: "user" as const, text: transcript }];
  const messages = updatedHistory.map((m) => ({
    role: m.who === "ai" ? ("assistant" as const) : ("user" as const),
    content: m.text,
  }));

  const roleContext = typeof jobContext === "string" && jobContext.trim().length > 0
    ? `\nYou are interviewing for: ${jobContext.trim().slice(0, 400)}`
    : "";

  const systemMessage = {
    role: "system" as const,
    content: `You are a professional interviewer conducting a realistic job interview.${roleContext}

Your goals:
1. Ask focused, relevant questions one at a time — specific to the role if context was provided.
2. After each candidate answer, give ONE sentence of brief, encouraging feedback.
3. Then ask a natural follow-up question or transition to the next topic.
4. Keep total response to 2-3 sentences — this is a voice conversation.
5. If the candidate seems nervous, be warm and encouraging.
6. If this is the start of the conversation, greet them professionally and ask your first question.

Do not give lengthy explanations. Be concise and conversational.`,
  };

  let reply = "";
  try {
    const chatResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 200,
      presence_penalty: 0.3,
      frequency_penalty: 0.3,
    });
    reply = chatResp.choices[0]?.message?.content?.trim() ?? "";
    if (!reply) reply = "I heard your response. Could you elaborate a bit more on that?";
  } catch (error: any) {
    console.error("GPT error:", error);
    return NextResponse.json({
      error: "AI interviewer temporarily unavailable.",
      transcript,
      reply: `I heard: "${transcript}". Please try again.`,
    }, { status: 500 });
  }

  return NextResponse.json({ transcript, reply, success: true }, {
    headers: { "Cache-Control": "no-cache" },
  });
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
