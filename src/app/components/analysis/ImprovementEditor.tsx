"use client";
import { useModalA11y } from "../../hooks/useModalA11y";
import { useState } from "react";
import { authFetch } from "../../lib/authFetch";
import type { ScanResult } from "../../lib/analysisV2";
export default function ImprovementEditor({
  resume,
  finding,
  onClose,
  onAccept,
}: {
  resume: string;
  finding: ScanResult["findings"][number];
  onClose: () => void;
  onAccept: (original: string, replacement: string) => Promise<void>;
}) {
  const [facts, setFacts] = useState("");
  const [replacement, setReplacement] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const modal = useModalA11y<HTMLElement>(() => {
    if (!loading) onClose();
  });
  async function suggest() {
    setLoading(true);
    setError("");
    try {
      const r = await authFetch("/api/improveResume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          passage: finding.evidence,
          instruction: finding.nextStep,
          facts,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setReplacement(data.content);
      setConfirmed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create an edit.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 overflow-y-auto p-4 sm:p-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="improve-title"
    >
      <section
        ref={modal}
        className="max-w-3xl mx-auto rounded-2xl bg-surface border border-border p-6 sm:p-8"
      >
        <div className="flex justify-between gap-4">
          <div>
            <p className="section-label">Make the change yours</p>
            <h2 id="improve-title" className="text-2xl mt-2">
              {finding.title}
            </h2>
          </div>
          <button
            disabled={loading}
            onClick={onClose}
            aria-label="Close improvement editor"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-fg-muted mt-4">{finding.nextStep}</p>
        <label className="block text-sm mt-5">
          Additional facts you can confirm (optional)
          <textarea
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
            maxLength={4000}
            disabled={loading}
            placeholder="Describe what actually happened. Leave blank if you don't have more detail."
            className="input w-full min-h-24 mt-2"
          />
        </label>
        <button
          disabled={loading}
          onClick={() => void suggest()}
          className="btn btn-primary mt-3"
        >
          {loading ? "Checking a suggested edit…" : "Suggest a rewrite"}
        </button>
        <p className="text-xs text-fg-muted mt-2">
          Uses one resume tailoring allowance. Rejected drafts are refunded.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <div>
            <h3 className="text-xs uppercase tracking-wider">Original</h3>
            <p className="text-sm whitespace-pre-wrap border border-border rounded-xl p-4 mt-2">
              {finding.evidence}
            </p>
          </div>
          <label className="text-xs uppercase tracking-wider">
            Your proposed change
            <textarea
              disabled={loading}
              value={replacement}
              onChange={(e) => {
                setReplacement(e.target.value);
                setConfirmed(false);
              }}
              maxLength={2500}
              className="input w-full min-h-40 mt-2 text-sm normal-case tracking-normal"
              placeholder="Generate a suggestion or write your own edit."
            />
          </label>
        </div>
        {replacement === finding.evidence && replacement && (
          <p className="text-sm mt-3">
            More factual detail is needed for this improvement. Add it above or
            edit the passage yourself.
          </p>
        )}
        <label className="flex gap-2 text-sm mt-5">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I checked this change and it accurately describes my experience.
        </label>
        {error && (
          <p role="alert" className="text-sm mt-3">
            {error}
          </p>
        )}
        <div className="flex gap-3 mt-5">
          <button
            disabled={loading || !confirmed || !replacement.trim()}
            className="btn btn-primary"
            onClick={() => {
              setLoading(true);
              void onAccept(finding.evidence, replacement)
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false));
            }}
          >
            Accept change
          </button>
          <button
            disabled={loading}
            onClick={onClose}
            className="btn btn-secondary"
          >
            Discard
          </button>
        </div>
      </section>
    </div>
  );
}
