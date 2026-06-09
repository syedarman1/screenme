// src/app/components/AudioChat.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { authFetch } from "../lib/authFetch";

export type ChatMsg = { id: number; who: "user" | "ai"; text: string };

interface AudioChatProps {
  jobContext?: string; // job description / role context for the AI interviewer
}

export default function AudioChat({ jobContext }: AudioChatProps) {
  const [msgs, setMsgs]                   = useState<ChatMsg[]>([]);
  const [isRecording, setIsRecording]     = useState(false);
  const [isProcessing, setIsProcessing]   = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSpeaking, setIsSpeaking]       = useState(false);
  const [isActive, setIsActive]           = useState(false);
  const [currentUser, setCurrentUser]     = useState<any>(null);

  const mediaRef    = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const streamRef   = useRef<MediaStream | null>(null);
  const synthRef    = useRef<SpeechSynthesis | null>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const mountedRef  = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      synthRef.current?.cancel();
      mediaRef.current?.state === "recording" && mediaRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Get current user
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (mountedRef.current) setCurrentUser(data?.user ?? null);
    });
  }, []);

  // Init speech synthesis
  useEffect(() => {
    if (typeof window === "undefined") return;
    synthRef.current = window.speechSynthesis;
  }, []);

  // Check mic permission
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((ps) => {
        if (mountedRef.current) setHasPermission(ps.state === "granted");
        ps.onchange = () => { if (mountedRef.current) setHasPermission(ps.state === "granted"); };
      })
      .catch(() => {});
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  /* ── Speech helpers ───────────────────────────────────── */
  const stripMarkdown = (text: string) =>
    text
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      .replace(/#{1,6}\s/g, "")
      .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/^\s*[-*+]\s+/gm, ". ")
      .replace(/\n+/g, " ")
      .trim();

  const stopSpeech = useCallback(() => {
    if (synthRef.current?.speaking) synthRef.current.cancel();
    if (mountedRef.current) setIsSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current || !text) return;
    stopSpeech();
    const utter = new SpeechSynthesisUtterance(stripMarkdown(text));
    utter.onstart  = () => { if (mountedRef.current) setIsSpeaking(true); };
    utter.onend    = () => { if (mountedRef.current) setIsSpeaking(false); };
    utter.onerror  = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") console.error("TTS error:", e.error);
      if (mountedRef.current) setIsSpeaking(false);
    };
    const voices = synthRef.current.getVoices();
    const preferred = voices.find((v) => /samantha|karen|female/i.test(v.name) && v.lang.startsWith("en"));
    if (preferred) utter.voice = preferred;
    synthRef.current.speak(utter);
  }, [stopSpeech]);

  /* ── Mic permission ───────────────────────────────────── */
  const requestMicPermission = async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      if (mountedRef.current) setHasPermission(true);
      return true;
    } catch {
      if (mountedRef.current) setHasPermission(false);
      return false;
    }
  };

  /* ── Start interview ──────────────────────────────────── */
  const handleStart = async () => {
    if (!hasPermission && !(await requestMicPermission())) {
      setMsgs([{ id: Date.now(), who: "ai", text: "Microphone access denied. Please allow microphone access in your browser settings and try again." }]);
      return;
    }
    const greeting = jobContext
      ? "Great — let's get started. I'll be interviewing you for this role today. Take a breath, speak naturally, and remember: specific examples from your experience make the strongest answers. Ready? Here's your first question: Can you walk me through your background and why you're interested in this role?"
      : "Welcome to your mock interview. I'll ask you a series of questions — answer as you would in a real interview. Speak clearly and take your time. Let's begin: Can you start by telling me about yourself and your professional background?";
    if (mountedRef.current) {
      setMsgs([{ id: Date.now(), who: "ai", text: greeting }]);
      setIsActive(true);
    }
    setTimeout(() => speak(greeting), 100);
  };

  /* ── Stop interview ───────────────────────────────────── */
  const handleStop = useCallback(() => {
    stopSpeech();
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (mountedRef.current) {
      setIsActive(false);
      setIsRecording(false);
      setIsProcessing(false);
    }
  }, [stopSpeech]);

  /* ── Recording ────────────────────────────────────────── */
  const startRecording = async () => {
    stopSpeech();
    if (!hasPermission && !(await requestMicPermission())) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
      return;
    }

    const recorder = new MediaRecorder(stream);
    mediaRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

    recorder.onstop = async () => {
      if (!mountedRef.current) return;
      setIsRecording(false);
      setIsProcessing(true);

      if (chunksRef.current.length === 0) {
        setMsgs((prev) => [...prev, { id: Date.now(), who: "ai", text: "No audio detected. Please speak into your microphone and try again." }]);
        setIsProcessing(false);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        return;
      }

      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      const placeholderId = Date.now();

      setMsgs((prev) => [...prev, { id: placeholderId, who: "user", text: "Processing…" }]);

      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      formData.append("history", JSON.stringify(msgs));
      if (jobContext) formData.append("jobContext", jobContext.slice(0, 600));

      try {
        const res = await authFetch("/api/interviewPrep", { method: "POST", body: formData });

        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || `Server error ${res.status}`);
        }

        const { transcript, reply } = await res.json();

        if (!mountedRef.current) return;
        setMsgs((prev) =>
          prev.map((m) => m.id === placeholderId ? { ...m, text: transcript || "(no transcript)" } : m)
        );
        setTimeout(() => {
          if (!mountedRef.current) return;
          setMsgs((prev) => [...prev, { id: Date.now() + 1, who: "ai", text: reply || "(no reply)" }]);
          speak(reply || "");
        }, 20);
      } catch (e: any) {
        if (!mountedRef.current) return;
        setMsgs((prev) =>
          prev.map((m) => m.id === placeholderId ? { ...m, text: `Error: ${e.message}` } : m)
        );
      } finally {
        if (mountedRef.current) setIsProcessing(false);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        chunksRef.current = [];
      }
    };

    recorder.start();
    if (mountedRef.current) { setIsRecording(true); setIsProcessing(false); }
  };

  const stopRecording = () => {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
  };

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto p-5 space-y-3 bg-bg"
      >
        {msgs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
            <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border/15 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stroke-fg" strokeWidth="1.5">
                <path d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                <path d="M12 19v4M8 23h8" />
              </svg>
            </div>
            <p className="text-fg-subtle text-sm">
              {isActive ? "Recording started — tap the mic button to speak." : 'Click "Start Interview" to begin your mock session.'}
            </p>
          </div>
        ) : (
          msgs.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.who === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.who === "ai" && (
                <div className="w-7 h-7 rounded-full bg-accent/10 border border-border/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-fg text-[10px] font-bold">AI</span>
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-2.5 rounded-lg text-sm leading-relaxed ${
                m.who === "user"
                  ? "bg-accent text-white rounded-br-sm"
                  : "bg-surface border border-border text-fg rounded-bl-sm"
              }`}>
                {m.text}
              </div>
              {m.who === "user" && (
                <div className="w-7 h-7 rounded-full bg-[#f0f0f5] border border-border-2 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-fg-muted text-[10px] font-bold">You</span>
                </div>
              )}
            </div>
          ))
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-accent/10 border border-border/20 flex items-center justify-center shrink-0">
              <span className="text-fg text-[10px] font-bold">AI</span>
            </div>
            <div className="px-4 py-2.5 bg-surface border border-border rounded-lg rounded-bl-sm">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-5 py-4 border-t border-border bg-surface">
        {!isActive ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-semibold text-sm transition-colors active:scale-[.98]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Start Interview
            </button>
            {!hasPermission && (
              <p className="text-xs text-fg-subtle flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                Microphone access required
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Mic button */}
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2.5 bg-surface-2 hover:bg-[#e0efff] text-fg border border-border/20 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                </svg>
                {isProcessing ? "Processing…" : "Speak"}
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2.5 pill-danger rounded-lg font-semibold text-sm transition-colors hover:opacity-90"
              >
                <span className="w-2 h-2 rounded-full bg-red animate-pulse" />
                Submit Answer
              </button>
            )}

            {/* Stop speech */}
            {isSpeaking && (
              <button
                onClick={stopSpeech}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium transition-colors hover:bg-amber-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Stop Speaking
              </button>
            )}

            {/* End interview */}
            <button
              onClick={handleStop}
              className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-bg text-fg-muted border border-border-2 rounded-lg text-sm font-medium hover:bg-surface-2 transition-colors"
            >
              End Interview
            </button>

            {/* Recording status */}
            {isRecording && (
              <span className="text-xs text-red flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-red animate-pulse" />
                Recording…
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
