// src/app/interview/page.tsx
"use client";

import React, { useState, useRef, useCallback } from "react";
import ResumeUploader from "../components/ResumeUploader";
import { motion, AnimatePresence } from "framer-motion";
import AudioChat from "../components/AudioChat";
import PlanChecker from "../components/PlanChecker";
import { supabase } from "../lib/supabaseClient";

type QuestionType = "Behavioral" | "Technical" | "Situational" | "Problem-Solving" | "Motivation" | "Role-Specific";
type Difficulty   = "Easy" | "Medium" | "Hard";

type QA = {
  question:    string;
  type:        QuestionType;
  difficulty:  Difficulty;
  modelAnswer: string;
  tip:         string;
};

/* ── Style maps ───────────────────────────────────────────── */
const TYPE_STYLES: Record<QuestionType, { bg: string; text: string; border: string; dot: string }> = {
  Behavioral:          { bg: "bg-purple-50",     text: "text-purple-700",  border: "border-purple-200",  dot: "bg-purple-400"   },
  Technical:           { bg: "bg-blue-50",        text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-400"     },
  Situational:         { bg: "bg-amber-50",       text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-400"    },
  "Problem-Solving":   { bg: "bg-teal-50",        text: "text-teal-700",    border: "border-teal-200",    dot: "bg-teal-400"     },
  Motivation:          { bg: "bg-rose-50",        text: "text-rose-700",    border: "border-rose-200",    dot: "bg-rose-400"     },
  "Role-Specific":     { bg: "bg-surface-2",      text: "text-fg",   border: "border-border/20", dot: "bg-accent"   },
};

const DIFF_STYLES: Record<Difficulty, string> = {
  Easy:   "text-emerald-600",
  Medium: "text-amber-600",
  Hard:   "text-red-500",
};

const DIFF_BG: Record<Difficulty, string> = {
  Easy:   "bg-emerald-50 border-emerald-200 text-emerald-700",
  Medium: "bg-amber-50 border-amber-200 text-amber-700",
  Hard:   "bg-red-50 border-red-200 text-red-700",
};

/* ── CopyButton ───────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${
        copied
          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
          : "bg-white text-fg-muted border-border-2 hover:text-fg hover:border-border/30"
      }`}
    >
      {copied ? (
        <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Copied</>
      ) : (
        <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
      )}
    </button>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export default function InterviewPrepPage() {
  const [resumeText, setResumeText]     = useState("");
  const [jobDesc, setJobDesc]           = useState("");
  const [roleContext, setRoleContext]   = useState("");
  const [qas, setQAs]                   = useState<QA[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [controller, setController]     = useState<AbortController | null>(null);
  const [openIdx, setOpenIdx]           = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<"prep" | "mock">("prep");
  const resultsRef = useRef<HTMLDivElement>(null);

  /* ── Generate questions ─────────────────────────────────── */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDesc.trim()) { setError("Job description is required."); return; }

    const ac = new AbortController();
    setController(ac);
    setLoading(true);
    setError(null);
    setQAs([]);
    setOpenIdx(null);

    try {
      if (!supabase) throw new Error("Authentication service not available");
      const { data: { user } } = await supabase.auth.getUser();

      const context = [
        roleContext.trim() ? roleContext.trim() : null,
        resumeText.trim() ? `Resume:\n${resumeText.trim()}` : null,
      ].filter(Boolean).join("\n\n");

      const res = await fetch("/api/interviewPrep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job: jobDesc,
          context: context || undefined,
          userId: user?.id,
        }),
        signal: ac.signal,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setQAs(data.questions ?? []);

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch (err: any) {
      if (err.name === "AbortError") setError("Generation cancelled.");
      else setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
      setController(null);
    }
  }, [jobDesc, resumeText, roleContext]);

  /* ── Audio context for mock interview ──────────────────── */
  const audioContext = [
    roleContext.trim() ? roleContext.trim() : null,
    jobDesc.trim() ? `Job Description:\n${jobDesc.trim().slice(0, 500)}` : null,
  ].filter(Boolean).join("\n\n");

  /* ── Derived ─────────────────────────────────────────────── */
  const typeBreakdown = qas.reduce<Record<string, number>>((acc, q) => {
    acc[q.type] = (acc[q.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-bg text-fg pt-16 pb-24 px-4">
      <PlanChecker requiredPlan="pro">

        {/* ── Header ──────────────────────────────────────── */}
        <header className="max-w-2xl mx-auto text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[18px] bg-accent/[0.08] border border-border/15 mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-fg" strokeWidth="1.5">
              <path d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <path d="M12 19v4M8 23h8" />
            </svg>
          </div>
          <h1 className="text-5xl font-semibold tracking-tight text-fg mb-3">
            Interview Prep
          </h1>
          <p className="text-fg-muted text-lg leading-relaxed max-w-lg mx-auto">
            Generate targeted questions with model answers, then practice out loud with an AI interviewer.
          </p>
        </header>

        {/* ── Section toggle ──────────────────────────────── */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex gap-1 p-1 bg-white border border-border rounded-2xl shadow-sm w-fit mx-auto">
            {(["prep", "mock"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeSection === s
                    ? "bg-accent text-white shadow-sm"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                {s === "prep" ? "Question Bank" : "Live Mock Interview"}
                {s === "mock" && (
                  <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-semibold">BETA</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            QUESTION BANK SECTION
            ════════════════════════════════════════════════ */}
        {activeSection === "prep" && (
          <div className="max-w-2xl mx-auto space-y-5">

            {/* Form card */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-8 space-y-7">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-fg">Resume</h2>
                  <span className="text-xs text-fg-subtle font-normal">Optional — improves answer relevance</span>
                </div>
                <ResumeUploader onResumeSubmit={setResumeText} />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#f0f0f5]" /></div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-xs text-fg-subtle font-medium">role details</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Job description */}
                <div>
                  <label htmlFor="jobDesc" className="block mb-1.5 text-sm font-semibold text-fg">
                    Job Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="jobDesc"
                    rows={6}
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    placeholder="Paste the full job description here — the more detail, the more targeted your questions will be…"
                    className="w-full bg-bg text-fg placeholder:text-fg-subtle p-4 rounded-2xl border border-border-2 focus:outline-none focus:border-border focus:ring-2 focus:ring-fg/10 resize-none text-sm leading-relaxed transition-all"
                  />
                </div>

                {/* Role + company (optional) */}
                <div>
                  <label htmlFor="roleCtx" className="block mb-1.5 text-sm font-semibold text-fg">
                    Role / Company
                    <span className="ml-1.5 font-normal text-xs text-fg-subtle">— helps generate culture-fit questions</span>
                  </label>
                  <input
                    id="roleCtx"
                    type="text"
                    value={roleContext}
                    onChange={(e) => setRoleContext(e.target.value)}
                    placeholder="e.g., Senior Backend Engineer at Stripe"
                    className="w-full bg-bg text-fg placeholder:text-fg-subtle p-3.5 rounded-xl border border-border-2 focus:outline-none focus:border-border focus:ring-2 focus:ring-fg/10 text-sm transition-all"
                  />
                </div>

                {/* Tip banner */}
                <div className="p-4 bg-surface-2 border border-border/15 rounded-2xl">
                  <p className="text-xs font-semibold text-fg mb-2">Interview Tips</p>
                  <ul className="space-y-1.5 text-xs text-fg-muted">
                    {[
                      "Use the STAR method for behavioral questions — Situation, Task, Action, Result",
                      "Prepare specific metrics and numbers to back up every claim",
                      "Research the company's mission, recent news, and products before the real interview",
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <svg className="w-3.5 h-3.5 text-fg mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading || !jobDesc.trim()}
                    className="flex-1 py-3.5 rounded-2xl text-white bg-accent font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-hover active:scale-[.98] transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                        </svg>
                        Generating Questions…
                      </>
                    ) : (
                      qas.length > 0 ? "Regenerate Questions" : "Generate Interview Questions"
                    )}
                  </button>
                  {controller && loading && (
                    <button
                      type="button"
                      onClick={() => controller.abort()}
                      className="px-5 py-3.5 rounded-2xl bg-red-50 text-red-600 border border-red-200 font-semibold text-sm hover:bg-red-100 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Status */}
            <div aria-live="polite">
              <AnimatePresence mode="wait">
                {loading && (
                  <motion.div key="loading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="bg-white rounded-3xl border border-border shadow-sm p-10 flex flex-col items-center gap-5">
                    <div className="relative w-14 h-14">
                      <div className="absolute inset-0 rounded-full border-[3px] border-[#e8e8ed]" />
                      <div className="absolute inset-0 rounded-full border-[3px] border-t-fg border-r-fg/20 border-b-transparent border-l-transparent animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stroke-fg" strokeWidth="1.5">
                          <path d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z" />
                          <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-fg">Generating your questions…</p>
                      <p className="text-fg-subtle text-sm mt-1">Crafting 6 targeted questions with model answers</p>
                    </div>
                  </motion.div>
                )}
                {error && !loading && (
                  <motion.div key="error" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start gap-3 p-5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm" role="alert">
                    <svg className="h-5 w-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Q&A results */}
            <AnimatePresence>
              {qas.length > 0 && (
                <motion.div
                  ref={resultsRef}
                  key="results"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
                >
                  <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">

                    {/* Results header */}
                    <div className="px-6 py-5 border-b border-[#f0f0f5] flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-fg">{qas.length} Interview Questions</h2>
                        <p className="text-xs text-fg-subtle mt-0.5">Click any question to expand the model answer</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(typeBreakdown).map(([type, count]) => {
                          const s = TYPE_STYLES[type as QuestionType] ?? TYPE_STYLES["Role-Specific"];
                          return (
                            <span key={type} className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.bg} ${s.text} ${s.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                              {type} ({count})
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Question list */}
                    <div className="divide-y divide-[#f0f0f5]">
                      {qas.map((qa, idx) => {
                        const ts = TYPE_STYLES[qa.type] ?? TYPE_STYLES["Role-Specific"];
                        const isOpen = openIdx === idx;

                        return (
                          <div key={idx}>
                            {/* Question row */}
                            <button
                              className="w-full text-left px-6 py-5 hover:bg-[#fafafa] transition-colors flex items-start gap-4"
                              onClick={() => setOpenIdx(isOpen ? null : idx)}
                              aria-expanded={isOpen}
                            >
                              <div className="w-7 h-7 rounded-full bg-[#f0f0f5] border border-[#e0e0e5] flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-fg-muted text-xs font-bold">{idx + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ts.bg} ${ts.text} ${ts.border}`}>
                                    {qa.type}
                                  </span>
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${DIFF_BG[qa.difficulty]}`}>
                                    {qa.difficulty}
                                  </span>
                                </div>
                                <p className="text-fg font-medium text-sm leading-relaxed pr-4">{qa.question}</p>
                              </div>
                              <svg
                                className={`w-5 h-5 text-fg-subtle shrink-0 mt-1 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {/* Expanded answer */}
                            <AnimatePresence>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1, transition: { duration: 0.2 } }}
                                  exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-6 pb-6 pl-[4.5rem] space-y-4">

                                    {/* Model answer */}
                                    <div className="bg-bg rounded-2xl p-4 border border-[#e8e8ed]">
                                      <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-semibold text-fg-subtle uppercase tracking-widest">Model Answer</p>
                                        <CopyButton text={qa.modelAnswer} />
                                      </div>
                                      <p className="text-fg text-sm leading-[1.8]">{qa.modelAnswer}</p>
                                    </div>

                                    {/* Tip */}
                                    {qa.tip && (
                                      <div className="flex items-start gap-3 px-4 py-3 bg-surface-2 border border-border/15 rounded-xl">
                                        <svg className="w-4 h-4 text-fg shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                        <p className="text-fg text-xs leading-relaxed">
                                          <span className="font-semibold">Tip: </span>{qa.tip}
                                        </p>
                                      </div>
                                    )}

                                    {/* STAR framework for behavioral */}
                                    {qa.type === "Behavioral" && (
                                      <div>
                                        <p className="text-[10px] font-semibold text-purple-500 uppercase tracking-widest mb-2">STAR Framework</p>
                                        <div className="grid grid-cols-4 gap-2 text-center">
                                          {[
                                            ["S", "Situation", "Set the context"],
                                            ["T", "Task",      "Your role"],
                                            ["A", "Action",    "What you did"],
                                            ["R", "Result",    "The outcome"],
                                          ].map(([letter, label, desc]) => (
                                            <div key={letter} className="p-2.5 bg-purple-50 border border-purple-100 rounded-xl">
                                              <div className="w-7 h-7 bg-purple-100 rounded-lg mx-auto mb-1.5 flex items-center justify-center">
                                                <span className="text-purple-700 font-bold text-sm">{letter}</span>
                                              </div>
                                              <p className="text-purple-700 text-xs font-semibold">{label}</p>
                                              <p className="text-purple-400 text-[10px] mt-0.5">{desc}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-[#f0f0f5] px-6 py-4 bg-[#fafafa]">
                      <p className="text-xs text-fg-subtle text-center">
                        Practice answers out loud — timing yourself builds confidence and natural pacing. Aim for 90–120 seconds per answer.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            LIVE MOCK INTERVIEW SECTION
            ════════════════════════════════════════════════ */}
        {activeSection === "mock" && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6">
              <div className="flex items-start gap-3 mb-5 p-4 bg-surface-2 border border-border/15 rounded-2xl">
                <svg className="w-5 h-5 text-fg shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-fg mb-1">How it works</p>
                  <p className="text-xs text-fg-muted leading-relaxed">
                    Click <strong>Start Interview</strong>, then tap <strong>Speak</strong> to record your answer. The AI interviewer will transcribe your voice, give brief feedback, and ask the next question. Add a job description in the Question Bank tab first — it makes the mock interview much more relevant.
                  </p>
                </div>
              </div>

              {audioContext && (
                <div className="mb-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-xs font-medium text-emerald-700">Role context loaded — interviewer knows the role</p>
                </div>
              )}

              <AudioChat jobContext={audioContext || undefined} />
            </div>
          </div>
        )}

      </PlanChecker>
    </div>
  );
}
