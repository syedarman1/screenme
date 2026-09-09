"use client";
import { useState } from "react";
import { authFetch } from "../../lib/authFetch";
export default function ReportFeedback({ runId }: { runId?: string }) {
  const [choice, setChoice] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!runId) return null;
  async function vote(helpful: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await authFetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: runId, helpful }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChoice(helpful);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save feedback.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="border-t border-border mt-6 pt-4 text-sm">
      <p>Was this useful?</p>
      <div className="flex gap-4 mt-2">
        {[true, false].map((value) => (
          <button
            key={String(value)}
            disabled={busy}
            aria-pressed={choice === value}
            className="underline aria-pressed:font-bold"
            onClick={() => void vote(value)}
          >
            {value ? "Yes" : "Needs improvement"}
          </button>
        ))}
      </div>
      {choice !== null && (
        <p role="status" className="text-xs text-fg-muted mt-2">
          Thanks. Your feedback helps us improve this tool.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
