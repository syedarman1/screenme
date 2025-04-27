// src/app/api/interviewConversation/route.ts

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
// Remove Readable import if trying direct file upload later
// import { Readable } from "stream";

type ChatMsg = { id: number; who: "user" | "ai"; text: string }; // Use the ID-based type if you updated the client

// Ensure API key is loaded correctly. Consider logging on server start if it's missing.
if (!process.env.OPENAI_API_KEY) {
    console.error("FATAL: OPENAI_API_KEY environment variable not set.");
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
    try { // Wrap main logic in a try...catch
        const form = await req.formData();

        // 1) Validate audio blob
        const audioEntry = form.get("audio");
        if (!(audioEntry instanceof File)) {
            console.error("Validation Error: Missing audio blob");
            return NextResponse.json({ error: "Missing audio blob" }, { status: 400 });
        }

        // Log audio details for debugging
        console.log(`Received audio file: name=<span class="math-inline">\{audioEntry\.name\}, size\=</span>{audioEntry.size}, type=${audioEntry.type}`);

        // Check for empty file
         if (audioEntry.size === 0) {
             console.error("Validation Error: Received empty audio file.");
             // You might want to return a specific error message the client can show
             return NextResponse.json({ error: "Received empty audio file." }, { status: 400 });
         }


        // 2) Validate chat history
        const historyStr = form.get("history");
        if (typeof historyStr !== "string") {
            console.error("Validation Error: Missing chat history string");
            return NextResponse.json({ error: "Missing chat history" }, { status: 400 });
        }

        let history: ChatMsg[] = [];
        try {
             history = JSON.parse(historyStr);
             // Add more validation for history structure if needed
        } catch (e) {
            console.error("Validation Error: Failed to parse chat history JSON", e);
            return NextResponse.json({ error: "Invalid chat history format" }, { status: 400 });
        }


        // --- 3) Transcribe with Whisper ---
        let transcript = "";
        try {
            // --- Option A: Keep current method (with logging) ---
            // const arrayBuf = await audioEntry.arrayBuffer();
            // const buffer = Buffer.from(arrayBuf);
            // const readableStream = Readable.from(buffer) as any; // Cast needed by SDK types sometimes
            // const whisperResponse = await openai.audio.transcriptions.create({
            //     model: "whisper-1",
            //     file: readableStream,
            //     // Optional: Add language if known
            //     // language: "en",
            // });

            // --- Option B: Try passing the File object directly (Recommended) ---
             console.log("Attempting transcription with File object...");
             const whisperResponse = await openai.audio.transcriptions.create({
                 model: "whisper-1",
                 file: audioEntry, // Pass the File object directly
                 // language: "en", // Optional
             });

            transcript = whisperResponse.text;
            console.log("Whisper Transcription Successful:", transcript);

            // Handle potentially empty transcriptions from Whisper
            if (!transcript || transcript.trim().length === 0) {
               console.warn("Whisper returned an empty or whitespace-only transcript.");
               // Decide how to handle - maybe return a specific message?
               // For now, we'll proceed, but GPT might get confused.
               // transcript = "[Silence]"; // Or assign a placeholder
            }

        } catch (error: any) {
            // Log the specific error from OpenAI SDK!
            console.error("ERROR DURING WHISPER TRANSCRIPTION:", error);
            // Return a structured error
            return NextResponse.json({
                 error: "Failed to transcribe audio.",
                 details: error.message || "Unknown transcription error",
                 code: error.code || "TRANSCRIPTION_FAILED"
                }, { status: 500 });
        }


        // --- 4) Append user turn ---
        history.push({ id: Date.now(), who: "user", text: transcript }); // Ensure ID matches client type


        // --- 5) GPT reply ---
        let reply = "";
        try {
            const chatResp = await openai.chat.completions.create({
                model: "gpt-4o-mini", // or your preferred model
                messages: history.map((m) => ({ role: m.who === 'ai' ? 'assistant' : m.who, content: m.text })) as any, // Map role correctly
                temperature: 0.75, // Adjust as needed
                max_tokens: 100
            });
            reply = chatResp.choices[0]?.message?.content?.trim() ?? "";
            console.log("GPT Reply Successful:", reply);

            if (!reply) {
                console.warn("GPT returned an empty reply.");
                // Handle empty reply - maybe return specific message?
                // reply = "[AI could not generate a response]";
            }

        } catch (error: any) {
             // Log the specific error from OpenAI SDK!
            console.error("ERROR DURING GPT COMPLETION:", error);
             // Decide: Still return transcript even if GPT fails? Yes.
            return NextResponse.json({
                 error: "Failed to get AI reply.",
                 details: error.message || "Unknown AI completion error",
                 code: error.code || "COMPLETION_FAILED",
                 transcript: transcript // Send transcript back anyway
                }, { status: 500 });
        }

        // --- 6) Append AI turn (Only needed if returning full history) ---
        // history.push({ id: Date.now() + 1, who: "ai", text: reply }); // Ensure ID matches client type


        // --- 7) Return transcript and reply (Recommended) ---
         console.log("Sending response to client:", { transcript, reply });
         return NextResponse.json({ transcript, reply }, { status: 200 });

        // --- Alternative: Return updated history (If client relies on it) ---
        // return NextResponse.json({ transcript, reply, history }, { status: 200 });

    } catch (e: any) {
         // Catch any unexpected errors during request processing
         console.error("UNEXPECTED API ROUTE ERROR:", e);
         return NextResponse.json({ error: "An unexpected server error occurred.", details: e.message }, { status: 500 });
    }
}