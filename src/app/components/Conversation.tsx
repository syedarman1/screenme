// src/app/components/Conversation.tsx
"use client";

import { useState, useRef } from "react";
import VideoFeed from "../components/VideoFeed";

type ChatMsg = { who: "user" | "ai"; text: string };

export default function Conversation() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [recording, setRecording] = useState<boolean>(false);
  const mediaRef    = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const streamRef   = useRef<MediaStream | null>(null);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    mediaRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setMsgs((m) => [...m, { who: "user", text: "🎤 (processing your answer…)" }]);

      const form = new FormData();
      form.append("audio", blob, "speech.webm");
      form.append("history", JSON.stringify(msgs));

      try {
        const res = await fetch("/api/interviewConversation", {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as {
          transcript: string;
          reply: string;
          history: ChatMsg[];
        };
        setMsgs(data.history);

        const utt = new SpeechSynthesisUtterance(data.reply);
        const voices = window.speechSynthesis.getVoices();
        const female = voices.find((v) => /female/i.test(v.name));
        if (female) utt.voice = female;
        window.speechSynthesis.speak(utt);
      } catch {
        setMsgs((m) => [
          ...m,
          { who: "ai", text: "⚠️ Error: Unable to connect to the interview service." },
        ]);
      } finally {
        streamRef.current?.getTracks().forEach((t) => t.stop());
      }
    };

    recorder.start();
    setRecording(true);
  };

  const stop = () => {
    setRecording(false);

    // explicit null check before calling stop()
    if (mediaRef.current) {
      if (mediaRef.current.state !== "inactive") {
        mediaRef.current.stop();
      }
    }

    // cancel any in-flight TTS
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-[var(--card-bg)] rounded-xl space-y-6">
      <h2 className="text-2xl font-bold text-[var(--accent)]">Live Mock Interview</h2>
      <VideoFeed />

      <div className="flex gap-4">
        <button
          onClick={start}
          disabled={recording}
          className="px-6 py-3 bg-[var(--accent)] text-[var(--background)] rounded-lg disabled:opacity-50"
        >
          Start
        </button>
        <button
          onClick={stop}
          disabled={!recording}
          className="px-6 py-3 bg-[var(--subtext)] text-[var(--background)] rounded-lg disabled:opacity-50"
        >
          Stop
        </button>
      </div>

      <div className="border border-[var(--border)] rounded-lg p-4 max-h-80 overflow-y-auto space-y-2">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={
              m.who === "user"
                ? "text-[var(--foreground)]"
                : "text-[var(--accent)]"
            }
          >
            <strong>{m.who === "user" ? "You:" : "AI:"}</strong> {m.text}
          </div>
        ))}
      </div>
    </div>
  );
}
