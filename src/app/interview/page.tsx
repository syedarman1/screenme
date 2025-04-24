"use client";

import React, { useState } from "react";

type QA = {
  question: string;
  modelAnswer: string;
};

export default function InterviewPrepPage() {
  const [jobDesc, setJobDesc] = useState("");
  const [context, setContext] = useState("");
  const [qas, setQAs] = useState<QA[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDesc.trim()) {
      setError("Job description is required.");
      return;
    }
    setLoading(true);
    setError(null);
    setQAs([]);

    try {
      const res = await fetch("/api/interviewPrep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job: jobDesc, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setQAs(data.questions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-28 pb-16 px-6">
      <div className="text-center mb-12 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold">Interview Prep</h1>
        <p className="mt-2 text-gray-400">
          Paste a job description (and optional context) to get tailored interview
          questions & model answers.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto bg-[#2a2a2a] rounded-xl p-8 space-y-6"
      >
        <div>
          <label htmlFor="jobDesc" className="block mb-2 font-semibold">
            Job Description
          </label>
          <textarea
            id="jobDesc"
            rows={6}
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            placeholder="Paste the job description here…"
            className="w-full bg-[#1c1c1c] text-gray-200 placeholder-gray-500 p-3 rounded-lg border border-gray-700 focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label htmlFor="context" className="block mb-2 font-semibold">
            Role/Company (optional)
          </label>
          <input
            id="context"
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. Senior Backend Engineer at Acme Corp"
            className="w-full bg-[#1c1c1c] text-gray-200 placeholder-gray-500 p-3 rounded-lg border border-gray-700 focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-[var(--accent)] text-black font-semibold rounded-lg transition disabled:opacity-50 hover:-translate-y-1 hover:shadow-xl"
        >
          {loading ? "Generating…" : "Generate Questions"}
        </button>

        {error && <p className="text-center text-red-500">{error}</p>}
      </form>

      {qas.length > 0 && (
        <section className="max-w-3xl mx-auto mt-10 bg-[#2a2a2a] rounded-xl p-8 space-y-6">
          {qas.map((qa, idx) => (
            <div key={idx} className="space-y-2">
              <p className="font-semibold text-[var(--accent)]">
                Q{idx + 1}. {qa.question}
              </p>
              <div className="bg-[#1c1c1c] p-4 rounded">
                <p className="text-gray-200 whitespace-pre-wrap">
                  {qa.modelAnswer}
                </p>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
