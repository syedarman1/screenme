// src/app/api/InterviewPrep/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type ChatMsg = { id: number; who: "user" | "ai"; text: string };

// Ensure API key is loaded correctly
if (!process.env.OPENAI_API_KEY) {
    console.error("FATAL: OPENAI_API_KEY environment variable not set.");
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000
});

export async function POST(req: NextRequest) {
    try {
        // Parse form data
        const form = await req.formData();

        // 1) Validate audio blob
        const audioEntry = form.get("audio");
        if (!(audioEntry instanceof File)) {
            console.error("Validation Error: Missing audio blob");
            return NextResponse.json({ 
              error: "Missing audio blob",
              code: "MISSING_AUDIO"
            }, { status: 400 });
        }

        // Log audio details for debugging
        console.log(`Received audio file: name=${audioEntry.name}, size=${audioEntry.size}, type=${audioEntry.type}`);

        // Check for empty file
        if (audioEntry.size === 0) {
            console.error("Validation Error: Received empty audio file.");
            return NextResponse.json({ 
              error: "Received empty audio file. Please record some audio and try again.",
              code: "EMPTY_AUDIO"
            }, { status: 400 });
        }

        // Check file size (max 25MB for Whisper)
        if (audioEntry.size > 25 * 1024 * 1024) {
            console.error("Validation Error: Audio file too large.");
            return NextResponse.json({ 
              error: "Audio file is too large. Maximum size is 25MB.",
              code: "FILE_TOO_LARGE"
            }, { status: 400 });
        }

        // 2) Validate chat history
        const historyStr = form.get("history");
        if (typeof historyStr !== "string") {
            console.error("Validation Error: Missing chat history string");
            return NextResponse.json({ 
              error: "Missing chat history",
              code: "MISSING_HISTORY"
            }, { status: 400 });
        }

        let history: ChatMsg[] = [];
        try {
            history = JSON.parse(historyStr);
            
            // Validate history structure
            if (!Array.isArray(history)) {
                throw new Error("History must be an array");
            }
            
            // Validate each message in history
            for (const msg of history) {
                if (!msg.id || !msg.who || !msg.text) {
                    throw new Error("Invalid message structure");
                }
                if (!["user", "ai"].includes(msg.who)) {
                    throw new Error("Invalid message role");
                }
            }
        } catch (e) {
            console.error("Validation Error: Failed to parse chat history JSON", e);
            return NextResponse.json({ 
              error: "Invalid chat history format",
              code: "INVALID_HISTORY"
            }, { status: 400 });
        }

        // 3) Transcribe with Whisper
        let transcript = "";
        try {
            console.log("Starting Whisper transcription...");
            
            const whisperResponse = await openai.audio.transcriptions.create({
                model: "whisper-1",
                file: audioEntry,
                language: "en", // Optional: specify language for better accuracy
                temperature: 0.2, // Lower temperature for more consistent transcription
            });

            transcript = whisperResponse.text?.trim() || "";
            console.log("Whisper Transcription Result:", transcript);

            // Handle potentially empty transcriptions from Whisper
            if (!transcript || transcript.length === 0) {
                console.warn("Whisper returned an empty transcript.");
                return NextResponse.json({
                    error: "Could not transcribe audio. Please speak clearly and try again.",
                    code: "EMPTY_TRANSCRIPT",
                    transcript: ""
                }, { status: 400 });
            }

            // Check for very short transcripts that might indicate issues
            if (transcript.length < 3) {
                console.warn("Whisper returned very short transcript:", transcript);
                return NextResponse.json({
                    error: "Transcription too short. Please speak for at least a few words.",
                    code: "SHORT_TRANSCRIPT",
                    transcript: transcript
                }, { status: 400 });
            }

        } catch (error: any) {
            console.error("ERROR DURING WHISPER TRANSCRIPTION:", error);
            return NextResponse.json({
                error: "Failed to transcribe audio. Please try again.",
                details: error.message || "Unknown transcription error",
                code: error.code || "TRANSCRIPTION_FAILED"
            }, { status: 500 });
        }

        // 4) Append user turn to history
        const newUserMessage: ChatMsg = { 
          id: Date.now(), 
          who: "user", 
          text: transcript 
        };
        const updatedHistory = [...history, newUserMessage];

        // 5) Generate GPT reply
        let reply = "";
        try {
            console.log("Generating AI response...");
            
            // Convert chat history to OpenAI format
            const messages = updatedHistory.map((m) => ({
                role: m.who === 'ai' ? 'assistant' as const : 'user' as const,
                content: m.text
            }));

            // Add system message for interview context
            const systemMessage = {
                role: 'system' as const,
                content: `You are a professional interviewer conducting a job interview. Be conversational, ask follow-up questions, and provide constructive feedback. Keep responses concise (1-3 sentences) since this is a voice conversation. Ask one question at a time and show genuine interest in the candidate's responses.`
            };

            const chatResp = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [systemMessage, ...messages],
                temperature: 0.75,
                max_tokens: 150, // Keep responses concise for voice interaction
                presence_penalty: 0.1, // Slight penalty to avoid repetition
                frequency_penalty: 0.1
            });
            
            reply = chatResp.choices[0]?.message?.content?.trim() ?? "";
            console.log("GPT Reply Generated:", reply);

            if (!reply) {
                console.warn("GPT returned an empty reply.");
                reply = "I'm sorry, I didn't catch that. Could you please repeat your response?";
            }

        } catch (error: any) {
            console.error("ERROR DURING GPT COMPLETION:", error);
            
            // Still return transcript even if GPT fails
            return NextResponse.json({
                error: "Failed to generate AI response, but here's your transcription.",
                details: error.message || "Unknown AI completion error",
                code: error.code || "COMPLETION_FAILED",
                transcript: transcript,
                reply: "I'm having trouble generating a response right now. Could you please try again?"
            }, { status: 500 });
        }

        // 6) Return successful response
        console.log("Sending successful response to client");
        return NextResponse.json({ 
            transcript, 
            reply,
            success: true 
        }, { 
            status: 200,
            headers: {
                'Cache-Control': 'no-cache', // Don't cache voice interactions
            }
        });

    } catch (e: any) {
        // Catch any unexpected errors during request processing
        console.error("UNEXPECTED API ROUTE ERROR:", e);
        return NextResponse.json({ 
            error: "An unexpected server error occurred. Please try again.",
            details: e.message || "Unknown server error",
            code: "UNEXPECTED_ERROR"
        }, { status: 500 });
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