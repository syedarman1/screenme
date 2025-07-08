// src/app/job-interview-prep/page.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import ResumeUploader from "../components/ResumeUploader";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import AudioChat from "../components/AudioChat";
import PlanChecker from "../components/PlanChecker";

type QA = {
  question: string;
  modelAnswer: string;
};

export default function InterviewPrepPage() {
  const [resumeText, setResumeText] = useState<string>("");
  const [jobDesc, setJobDesc] = useState<string>("");
  const [context, setContext] = useState<string>("");
  const [qas, setQAs] = useState<QA[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [showTips, setShowTips] = useState<boolean>(true);
  const qasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (qas.length > 0 && qasRef.current && !loading) {
      const rect = qasRef.current.getBoundingClientRect();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
      });
    }
  }, [qas, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDesc.trim()) {
      setError("Job description is required.");
      return;
    }

    const ac = new AbortController();
    setController(ac);
    setLoading(true);
    setError(null);
    setQAs([]);

    try {
      const res = await fetch("/api/interviewPrep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job: jobDesc,
          context: resumeText ? `${context}\nResume: ${resumeText}` : context,
        }),
        signal: ac.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setQAs(data.questions);
    } catch (err: any) {
      if (err.name === "AbortError") setError("Generation cancelled");
      else setError(err.message);
    } finally {
      setLoading(false);
      setController(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-16 pb-16">
      <PlanChecker requiredPlan="pro">
      {/* Header */}
      <header className="max-w-5xl mx-auto text-center mb-8 px-6">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-[var(--accent)] rounded-xl flex items-center justify-center shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 10v2a7 7 0 11-14 0v-2"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19v4"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 23h8"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--accent)]">
          Job Interview Prep
        </h1>
        <p className="mt-3 text-lg text-[var(--gray-300)] max-w-2xl mx-auto">
          Paste a job description (and optional context) to get tailored
          interview questions & model answers, or jump into a live mock
          interview below.
        </p>
      </header>

      {/* Inline Tips Section */}
      {showTips && (
        <div className="max-w-5xl mx-auto mb-8 px-6">
          <div className="bg-[var(--neutral-800)]/30 border border-[var(--neutral-700)] rounded-xl p-4 relative">
            <button
              className="absolute top-2 right-2 text-[var(--gray-400)] hover:text-[var(--foreground)]"
              onClick={() => setShowTips(false)}
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
            </button>
            <h3 className="text-lg font-medium text-[var(--yellow-300)] mb-2">
              Quick Interview Tips
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-[var(--gray-300)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--yellow-300)] flex-shrink-0">
                  ✓
                </span>
                Maintain eye contact with the camera
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--yellow-300)] flex-shrink-0">
                  ✓
                </span>
                Use specific examples in your answers
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--yellow-300)] flex-shrink-0">
                  ✓
                </span>
                Speak clearly and at a moderate pace
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--yellow-300)] flex-shrink-0">
                  ✓
                </span>
                Research the company’s mission and values
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Q&A Generator */}
      <section className="w-full max-w-5xl mx-auto px-6">
        <div className="bg-[var(--neutral-800)] rounded-xl border border-[var(--neutral-700)] p-6 shadow-xl space-y-6">
          <h2 className="text-xl font-semibold text-[var(--gray-200)]">
            Generate Interview Questions
          </h2>
          <ResumeUploader onResumeSubmit={setResumeText} />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="jobDesc"
                  className="block mb-1 font-semibold text-[var(--gray-200)]"
                >
                  Job Description
                </label>
                <textarea
                  id="jobDesc"
                  rows={6}
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  placeholder="Paste the job description here…"
                  className="w-full bg-[var(--neutral-900)] text-[var(--gray-200)] placeholder-[var(--gray-400)] p-3 rounded border border-[var(--neutral-700)] focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
                  aria-required="true"
                />
              </div>
              <div>
                <label
                  htmlFor="context"
                  className="block mb-1 font-semibold text-[var(--gray-200)]"
                >
                  Role/Company (Optional)
                </label>
                <input
                  id="context"
                  type="text"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g., Senior Backend Engineer at Acme Corp"
                  className="w-full bg-[var(--neutral-900)] text-[var(--gray-200)] placeholder-[var(--gray-400)] p-3 rounded border border-[var(--neutral-700)] focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-xl transition-transform flex items-center justify-center"
              style={{ backgroundColor: "var(--accent)" }}
              aria-disabled={loading}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-black"
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
                  Generating…
                </>
              ) : (
                "Generate Questions"
              )}
            </button>

            {controller && (
              <button
                onClick={() => controller.abort()}
                className="w-full py-3 rounded-lg bg-[var(--red-900)]/50 hover:bg-[var(--red-800)] text-[var(--red-300)] border border-[var(--red-800)] font-semibold transition-colors"
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </section>

      {/* Loading & Error States */}
      <section
        className="w-full max-w-5xl mx-auto mt-8 px-6"
        aria-live="polite"
        aria-busy={loading}
      >
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 bg-[var(--neutral-800)] rounded-xl border border-[var(--neutral-700)] shadow-xl flex flex-col items-center gap-4"
            >
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-t-[var(--accent)] border-r-[var(--accent)] border-b-[var(--neutral-700)] border-l-[var(--neutral-700)] rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-[var(--gray-200)]">
                  Generating your questions...
                </h3>
                <p className="text-[var(--gray-400)] mt-2">
                  Our AI is preparing tailored interview questions
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 bg-[var(--red-900)]/30 border border-[var(--red-800)] text-[var(--red-300)] rounded-lg flex items-center justify-center mt-8"
              role="alert"
            >
              <svg
                className="h-5 w-5 mr-2"
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
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Generated Q&A */}
      <AnimatePresence>
        {qas.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-5xl mx-auto mt-8 px-6"
            ref={qasRef}
          >
            <div className="bg-[var(--neutral-800)] rounded-xl border border-[var(--neutral-700)] p-8 shadow-xl space-y-6">
              <h2 className="text-2xl font-semibold text-[var(--gray-200)]">
                Your Interview Questions
              </h2>
              {qas.map((qa, idx) => (
                <div key={idx} className="space-y-2">
                  <p className="font-semibold text-[var(--accent)]">
                    Q{idx + 1}. {qa.question}
                  </p>
                  <div className="bg-[var(--neutral-800)] p-4 rounded-lg border border-[var(--neutral-700)]">
                    <p className="text-[var(--gray-200)] whitespace-pre-wrap font-mono">
                      {qa.modelAnswer}
                    </p>
                  </div>
                </div>
              ))}
              <div className="border-t border-[var(--neutral-700)] pt-4">
                <p className="text-[var(--gray-400)] text-sm text-center">
                  <span className="text-[var(--accent)]">Pro Tip:</span>{" "}
                  Practice these questions aloud to build confidence!
                </p>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Live Mock Interview */}
     
      <section className="w-full max-w-5xl mx-auto mt-16 px-6 space-y-6">
        {/* Title */}
        <h2 className="text-xl font-semibold text-[var(--gray-200)] text-center md:text-left">
          Speak to AI (BETA)
        </h2>

        {/* AudioChat component is now a direct child, removing the max-w-3xl constraint */}
        <AudioChat />

        {/* Pro Tip */}
        <div className="border-t border-[var(--neutral-700)] pt-4">
          <p className="text-[var(--gray-400)] text-sm text-center">
            <span className="text-[var(--accent)]">Pro Tip:</span> Use the mock
            interview to simulate real-time pressure!
          </p>
        </div>
      </section>
      </PlanChecker>
    </div>
  );
}
