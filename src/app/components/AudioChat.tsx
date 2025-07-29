// src/app/components/AudioChat.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import VideoFeed from "./VideoFeed";
import { supabase } from "../lib/supabaseClient";

export type ChatMsg = { id: number; who: "user" | "ai"; text: string };

export default function AudioChat() {
  // --- State Variables ---
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [startDisabled, setStartDisabled] = useState(true); // Default to true on server
  const [currentUser, setCurrentUser] = useState<any>(null);

  // --- Refs ---
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // --- Get current user ---
  useEffect(() => {
    const getCurrentUser = async () => {
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  // --- Initialize startDisabled on client ---
  useEffect(() => {
    // This runs only on the client
    const disabled =
      !hasPermission &&
      (typeof navigator === "undefined" || !navigator.permissions);
    setStartDisabled(disabled);
  }, [hasPermission]);

  // --- TTS Handling ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      const loadVoices = () => {
        const voices = synthRef.current?.getVoices();
        if (voices?.length) {
          console.log("Voices loaded");
        } else {
          console.log("Waiting for voices...");
        }
      };
      setTimeout(loadVoices, 50);
      if (synthRef.current && synthRef.current.onvoiceschanged !== undefined) {
        synthRef.current.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  const stripMarkdown = (text: string): string =>
    text
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      .replace(/#{1,6}\s/g, "")
      .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/^\s*[-*+]\s+/gm, ". ")
      .replace(/\d+\.\s+/g, ". ")
      .replace(/\n+/g, " ")
      .trim();

  const speak = (text: string) => {
    if (!synthRef.current || !text) return;
    stopSpeech();
    const utter = new SpeechSynthesisUtterance(stripMarkdown(text));
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = (event: SpeechSynthesisErrorEvent) => {
      if (event.error === "canceled" || event.error === "interrupted") {
        console.log(`Speech stopped: ${event.error}`);
      } else {
        console.error("SpeechSynthesisUtterance error:", event.error, event);
      }
      setIsSpeaking(false);
    };
    const voices = synthRef.current.getVoices();
    const female = voices.find(
      (v) => /female/i.test(v.name) && v.lang.startsWith("en")
    );
    if (female) utter.voice = female;
    synthRef.current.speak(utter);
  };

  const stopSpeech = () => {
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.cancel();
    }
    if (isSpeaking) setIsSpeaking(false);
  };

  // --- Permission Handling ---
  const getMicrophonePermission = async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Mic access not supported.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (err) {
      console.error("Mic permission error:", err);
      setHasPermission(false);
      alert(
        "Microphone access was denied. Please enable it in browser settings."
      );
      return false;
    }
  };

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((ps) => {
          setHasPermission(ps.state === "granted");
          ps.onchange = () => setHasPermission(ps.state === "granted");
        })
        .catch(() => setHasPermission(false));
    } else {
      console.warn(
        "Permissions API not supported for microphone state checking."
      );
    }
  }, []);

  // --- Recording Logic ---
  const startRecordingInternal = async () => {
    stopSpeech();
    if (!hasPermission && !(await getMicrophonePermission())) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch (err) {
      alert("Could not start recording. Check microphone.");
      return;
    }

    const recorder = new MediaRecorder(stream);
    mediaRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      setIsRecording(false);
      setIsProcessing(true);
      if (chunksRef.current.length === 0) {
        setMsgs((prev) => [
          ...prev,
          { id: Date.now(), who: "ai", text: "⚠️ No audio detected." },
        ]);
        setIsProcessing(false);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        return;
      }
      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      const form = new FormData();
      form.append("audio", audioBlob, "audio.webm");
      form.append("history", JSON.stringify(msgs));

      if (currentUser?.id) {
        form.append("userId", currentUser.id);
      }

      const placeholderId = Date.now();
      setMsgs((prev) => [
        ...prev,
        { id: placeholderId, who: "user", text: "🎤 (Processing…)" },
      ]);
      try {
        const res = await fetch("/api/interviewPrep", {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          let errorDetails = `Server error ${res.status}`;
          try {
            const d = await res.json();
            // Handle Pro feature requirement error specifically
            if (d.code === "PRO_FEATURE_REQUIRED") {
              errorDetails = "🔒 " + d.error;
            } else {
              errorDetails = d.error || d.message || errorDetails;
            }
          } catch {}
          throw new Error(errorDetails);
        }

        const { transcript, reply } = await res.json();
        setMsgs((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? { ...m, text: transcript || "[Silence]" }
              : m
          )
        );
        setTimeout(() => {
          setMsgs((prev) => [
            ...prev,
            { id: Date.now() + 1, who: "ai", text: reply || "[No Reply]" },
          ]);
          speak(reply || "");
        }, 10);
      } catch (e: any) {
        console.error("API/Fetch error in onstop:", e);
        setMsgs((prev) =>
          prev.map((m) =>
            m.id === placeholderId ? { ...m, text: `⚠️ ${e.message}` } : m
          )
        );
      } finally {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        chunksRef.current = [];
        setIsProcessing(false);
      }
    };
    recorder.start();
    setIsRecording(true);
    setIsProcessing(false);
  };

  const stopRecordingInternal = () => {
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
    }
  };

  // --- Interview State Handlers ---
  const handleStartInterview = async () => {
    if (!hasPermission && !(await getMicrophonePermission())) return;
    const greeting =
      "Okay, let's start the mock interview. Ask your first question, or tell me what role you're preparing for.";
    setMsgs([{ id: Date.now(), who: "ai", text: greeting }]);
    setIsInterviewActive(true);
    speak(greeting);
  };

  const handleStopInterview = () => {
    stopSpeech();
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    else {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsInterviewActive(false);
    setIsRecording(false);
    setIsProcessing(false);
    setIsSpeaking(false);
  };

  // --- Cleanup Effect ---
  useEffect(() => {
    return () => handleStopInterview();
  }, []);

  // --- Render JSX ---
  return (
    <div className="bg-[var(--neutral-800)] border border-[var(--neutral-700)] rounded-xl p-6 shadow-xl space-y-6">
      <h3 className="text-xl font-semibold text-[var(--gray-200)]">
        Live Mock Interview
      </h3>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Controls Column */}
        <div className="space-y-4">
          <VideoFeed />
          <div className="flex flex-wrap gap-3 items-center">
            {/* Interview Start/Stop Buttons */}
            {!isInterviewActive ? (
              <button
                onClick={handleStartInterview}
                disabled={startDisabled}
                className="px-5 py-2 bg-[var(--accent)] text-black rounded-lg font-medium hover:-translate-y-1 hover:shadow-xl transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 3v18l14-9L5 3z"
                  />
                </svg>
                Start Interview
              </button>
            ) : (
              <button
                onClick={handleStopInterview}
                className="px-5 py-2 bg-[var(--red-900)] hover:bg-[var(--red-800)] text-[var(--red-300)] rounded-lg font-medium hover:-translate-y-1 hover:shadow-xl transition-transform flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 6h12v12H6z"
                  />
                </svg>
                Stop Interview
              </button>
            )}

            {/* Recording/Submit Buttons - Shown only when interview is active */}
            {isInterviewActive && (
              <>
                <button
                  onClick={startRecordingInternal}
                  disabled={isRecording || isProcessing || !hasPermission}
                  className="px-5 py-2 bg-[var(--accent)] text-black rounded-lg font-medium hover:-translate-y-1 hover:shadow-xl transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg
                    className={`w-5 h-5 ${isRecording ? "animate-pulse" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                  {isRecording ? "Recording..." : "Start Recording"}
                </button>
                <button
                  onClick={stopRecordingInternal}
                  disabled={!isRecording}
                  className="px-5 py-2 bg-[var(--neutral-700)] text-[var(--gray-200)] rounded-lg font-medium hover:-translate-y-1 hover:shadow-xl transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  aria-label="Submit Answer"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Submit Answer
                </button>
              </>
            )}

            {/* Stop Speech Button */}
            {isSpeaking && (
              <button
                onClick={stopSpeech}
                className="px-5 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium hover:-translate-y-1 hover:shadow-xl transition-transform animate-pulse flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Stop Speech
              </button>
            )}
          </div>

          {/* Processing Indicator */}
          {isProcessing && !isSpeaking && (
            <div className="text-sm text-[var(--gray-400)] flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4 text-[var(--accent)]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"
                />
              </svg>
              Processing your response…
            </div>
          )}

          {/* Permission Hint */}
          {!hasPermission && !isInterviewActive && (
            <p className="text-xs text-[var(--gray-400)] flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[var(--gray-400)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Microphone permission needed. Click "Start Interview".
            </p>
          )}
        </div>

        {/* Transcript Column */}
        <div className="w-full">
          <div className="h-64 max-h-64 overflow-y-auto space-y-3 border border-[var(--neutral-700)] rounded-lg p-4 bg-[var(--neutral-900)] text-sm shadow-inner">
            {msgs.length === 0 && !isProcessing ? (
              <p className="text-sm text-[var(--gray-400)] italic text-center py-4">
                {isInterviewActive
                  ? "Interview started..."
                  : 'Click "Start Interview" to begin...'}
              </p>
            ) : (
              msgs.map((m) => (
                <div
                  key={m.id}
                  className={`p-2 rounded-lg ${
                    m.who === "user"
                      ? "bg-[var(--neutral-800)] text-[var(--gray-200)]"
                      : "bg-[var(--accent)]/20 text-[var(--accent)]"
                  }`}
                >
                  <strong>{m.who === "user" ? "You:" : "AI:"}</strong> {m.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
