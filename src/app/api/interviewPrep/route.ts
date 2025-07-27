// src/app/api/InterviewPrep/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ErrorTypes, handleAPIError } from "../../lib/errorHandler";

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
        const contentType = req.headers.get('content-type') || '';
        
        // Handle Q&A Generation (JSON requests)
        if (contentType.includes('application/json')) {
            return handleQAGeneration(req);
        }
        
        // Handle Audio Chat (FormData requests)
        if (contentType.includes('multipart/form-data')) {
            return handleAudioChat(req);
        }
        
        return NextResponse.json(
            {
                error: "Unsupported content type. Use JSON for Q&A generation or FormData for audio chat.",
                details: {
                    message: "Invalid request format",
                    code: "UNSUPPORTED_CONTENT_TYPE",
                    action: "Check your request headers and content type."
                },
                timestamp: new Date().toISOString()
            },
            { status: 400 }
        );
    } catch (e: any) {
        console.error("UNEXPECTED API ROUTE ERROR:", e);
        return handleAPIError(e);
    }
}

async function handleQAGeneration(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { job, context } = body;

        // Validate required fields
        if (!job || typeof job !== 'string' || job.trim().length < 20) {
            return NextResponse.json(
                {
                    error: "Job description must be at least 20 characters. Include role requirements and responsibilities.",
                    details: {
                        message: "Job description too short",
                        code: "INVALID_JOB_DESCRIPTION",
                        action: "Paste the complete job posting including requirements and responsibilities."
                    },
                    timestamp: new Date().toISOString()
                },
                { status: 400 }
            );
        }

        // Generate interview questions using OpenAI
        try {
            const systemPrompt = `You are an experienced interview coach. Generate 5-7 relevant interview questions for the given job description and context. For each question, provide a model answer that demonstrates best practices.

Return ONLY valid JSON in this format:
{
  "questions": [
    {
      "question": "Tell me about your experience with...",
      "modelAnswer": "A good answer would highlight specific examples..."
    }
  ]
}`;

            const userContent = `Job Description:\n${job.trim()}\n\nAdditional Context:\n${context?.trim() || 'No additional context provided'}`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userContent }
                ],
                temperature: 0.7,
                max_tokens: 2000,
                response_format: { type: "json_object" }
            });

            const result = completion.choices[0]?.message?.content;
            if (!result) {
                throw ErrorTypes.OPENAI_SERVICE_ERROR();
            }

            const parsed = JSON.parse(result);
            if (!parsed.questions || !Array.isArray(parsed.questions)) {
                throw ErrorTypes.INVALID_RESPONSE_FORMAT();
            }

            return NextResponse.json(parsed, {
                headers: {
                    'Cache-Control': 'private, max-age=1800'
                }
            });

        } catch (error: any) {
            console.error("ERROR DURING Q&A GENERATION:", error);
            
            if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
                return NextResponse.json(
                    {
                        error: "Interview question generation temporarily unavailable due to high demand.",
                        details: {
                            message: "Service temporarily overloaded",
                            code: "OPENAI_RATE_LIMITED",
                            action: "Wait 2-3 minutes and try generating questions again."
                        },
                        timestamp: new Date().toISOString()
                    },
                    { status: 503 }
                );
            }
            
            const serviceError = ErrorTypes.OPENAI_SERVICE_ERROR();
            return handleAPIError(serviceError);
        }

    } catch (error: any) {
        console.error("Error in Q&A generation:", error);
        return handleAPIError(error);
    }
}

async function handleAudioChat(req: NextRequest) {
    try {
        // Parse form data
        const form = await req.formData();

        // 1) Validate audio blob
        const audioEntry = form.get("audio");
        if (!(audioEntry instanceof File)) {
            console.error("Validation Error: Missing audio blob");
            const audioError = ErrorTypes.INVALID_INPUT('Audio file', 'is required for interview practice');
            return NextResponse.json(
              {
                error: audioError.message,
                details: {
                  message: audioError.message,
                  code: audioError.code,
                  action: 'Please record audio before submitting.'
                },
                timestamp: new Date().toISOString()
              },
              { status: audioError.status }
            );
        }

        // Log audio details for debugging
        console.log(`Received audio file: name=${audioEntry.name}, size=${audioEntry.size}, type=${audioEntry.type}`);

        // Check for empty file
        if (audioEntry.size === 0) {
            console.error("Validation Error: Received empty audio file.");
            return NextResponse.json(
              {
                error: "No audio detected. Please record your voice and try again.",
                details: {
                  message: "Audio recording is empty",
                  code: "EMPTY_AUDIO",
                  action: "Ensure your microphone is working and speak clearly into it."
                },
                timestamp: new Date().toISOString()
              },
              { status: 400 }
            );
        }

        // Check file size (max 25MB for Whisper)
        if (audioEntry.size > 25 * 1024 * 1024) {
            console.error("Validation Error: Audio file too large.");
            return NextResponse.json(
              {
                error: "Audio recording too long. Please keep responses under 25MB (about 20 minutes).",
                details: {
                  message: "Audio file exceeds maximum size limit",
                  code: "FILE_TOO_LARGE",
                  action: "Record a shorter response or compress your audio file."
                },
                timestamp: new Date().toISOString()
              },
              { status: 413 }
            );
        }

        // 2) Validate chat history
        const historyStr = form.get("history");
        if (typeof historyStr !== "string") {
            console.error("Validation Error: Missing chat history string");
            const historyError = ErrorTypes.INVALID_INPUT('Chat history', 'is required for context');
            return NextResponse.json(
              {
                error: historyError.message,
                details: {
                  message: historyError.message,
                  code: historyError.code,
                  action: 'This is likely a technical issue. Please refresh the page and try again.'
                },
                timestamp: new Date().toISOString()
              },
              { status: historyError.status }
            );
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
            return NextResponse.json(
              {
                error: "Invalid conversation format detected.",
                details: {
                  message: "Chat history is corrupted",
                  code: "INVALID_HISTORY",
                  action: "Refresh the page to start a new interview session."
                },
                timestamp: new Date().toISOString()
              },
              { status: 400 }
            );
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
                const transcriptionError = ErrorTypes.TRANSCRIPTION_FAILED();
                return NextResponse.json(
                  {
                    error: "Could not understand your audio. Please speak clearly and try again.",
                    details: {
                      message: transcriptionError.message,
                      code: "EMPTY_TRANSCRIPT",
                      action: "Speak more clearly, check your microphone, and ensure there's no background noise."
                    },
                    transcript: "",
                    timestamp: new Date().toISOString()
                  },
                  { status: 400 }
                );
            }

            // Check for very short transcripts that might indicate issues
            if (transcript.length < 3) {
                console.warn("Whisper returned very short transcript:", transcript);
                return NextResponse.json(
                  {
                    error: "Response too brief. Please provide a more detailed answer to the interview question.",
                    details: {
                      message: "Transcription too short",
                      code: "SHORT_TRANSCRIPT",
                      action: "Speak for at least a few sentences to provide a complete answer."
                    },
                    transcript: transcript,
                    timestamp: new Date().toISOString()
                  },
                  { status: 400 }
                );
            }

        } catch (error: any) {
            console.error("ERROR DURING WHISPER TRANSCRIPTION:", error);
            const transcriptionError = ErrorTypes.TRANSCRIPTION_FAILED();
            return NextResponse.json(
              {
                error: transcriptionError.message,
                details: {
                  message: transcriptionError.message,
                  code: transcriptionError.code,
                  action: transcriptionError.action,
                  technicalDetails: error.message || "Unknown transcription error"
                },
                timestamp: new Date().toISOString()
              },
              { status: transcriptionError.status }
            );
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
            
            // Check for specific OpenAI error types
            if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
                return NextResponse.json(
                  {
                    error: "Interview AI temporarily unavailable due to high demand.",
                    details: {
                      message: "Service temporarily overloaded",
                      code: "OPENAI_RATE_LIMITED",
                      action: "Wait 2-3 minutes and continue your interview practice."
                    },
                    transcript: transcript,
                    reply: "I heard you say: '" + transcript + "'. Let me think about that for a moment... Could you please try asking again?",
                    timestamp: new Date().toISOString()
                  },
                  { status: 503 }
                );
            }
            
            // Still return transcript even if GPT fails
            const serviceError = ErrorTypes.OPENAI_SERVICE_ERROR();
            return NextResponse.json(
              {
                error: "AI interviewer temporarily unavailable, but I heard your response.",
                details: {
                  message: serviceError.message,
                  code: serviceError.code,
                  action: "Your response was recorded. Try continuing the conversation.",
                  technicalDetails: error.message || "Unknown AI completion error"
                },
                transcript: transcript,
                reply: "I heard you say: '" + transcript + "'. I'm having trouble generating a response right now. Could you please try again?",
                timestamp: new Date().toISOString()
              },
              { status: 500 }
            );
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
        return handleAPIError(e);
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