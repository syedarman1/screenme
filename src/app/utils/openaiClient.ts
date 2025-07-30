// src/app/utils/openaiClient.ts

import OpenAI from "openai";
import { Readable } from "stream";

// local message type
export type PromptMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// Only create OpenAI client if API key is available
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function transcribeAudio(buffer: Buffer): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI client not available - missing API key');
  }
  
  // wrap your Buffer in a Readable and cast to any
  const stream = Readable.from(buffer) as any;
  const resp = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file: stream,       // <-- no fileName here
  });
  return resp.text;
}

export async function chatCompletionStream(
  messages: readonly PromptMessage[],
  onDelta: (delta: string) => void
): Promise<void> {
  if (!openai) {
    throw new Error('OpenAI client not available - missing API key');
  }
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages as any,  // cast so TS stops complaining
    stream: true,
  });
  for await (const part of completion) {
    const delta = part.choices[0]?.delta?.content;
    if (delta) onDelta(delta);
  }
}

export async function textToSpeech(text: string): Promise<Buffer> {
  if (!openai) {
    throw new Error('OpenAI client not available - missing API key');
  }
  
  const resp = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",     // required by the SDK
    input: text,
  });
  const buf = await resp.arrayBuffer();
  return Buffer.from(buf);
}
