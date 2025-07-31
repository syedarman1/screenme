"use client";

import React, { useState, useRef, useEffect } from "react";
import ResumeUploader from "../components/ResumeUploader";
import { motion, AnimatePresence } from "framer-motion";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import confetti from "canvas-confetti";
import PlanChecker from "../components/PlanChecker";
import { supabase } from "../lib/supabaseClient";

export type Severity = "low" | "medium" | "high";

interface IssueObj {
  section: string;
  line: string;
  text: string;
  severity: Severity;
  reason?: string;
}

interface ActionObj {
  section: string;
  original: string;
  rewrite: string;
  improvement?: string;
}

interface KeywordObj {
  category: string;
  terms: string[];
  missing?: string[];
}

interface StrengthObj {
  section: string;
  text: string;
  reason: string;
}

interface Audit {
  score: number;
  issues: IssueObj[];
  actions: ActionObj[];
  strengths?: StrengthObj[];
  keywords?: KeywordObj[];
  summary?: string;
  metadata?: {
    analyzedAt: string;
    detectedFormat: string;
    bulletStyle: string;
    sectionsFound: number;
  };
}

const badgeColor = {
  low: "bg-[var(--green-900)] text-[var(--green-300)] border-[var(--green-800)]",
  medium: "bg-[var(--yellow-900)] text-[var(--yellow-300)] border-[var(--yellow-800)]",
  high: "bg-[var(--red-900)] text-[var(--red-300)] border-[var(--red-800)]",
} as const;

const sectionIcons = {
  Education: "🎓",
  Skills: "🛠️",
  Experience: "💼",
  Projects: "🚀",
  Summary: "📋",
  Certifications: "🏆",
  Other: "📝",
} as const;

export default function ResumeScreen() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [activeTab, setActiveTab] = useState<"issues" | "strengths" | "keywords">("issues");
  const [showTips, setShowTips] = useState(true);
  const scoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (audit?.score && audit.score >= 85 && scoreRef.current) {
      const rect = scoreRef.current.getBoundingClientRect();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
      });
    }
  }, [audit?.score]);

  const sendToApi = async (resume: string) => {
    const ac = new AbortController();
    setController(ac);
    setLoading(true);
    setError(null);
    setAudit(null);

    try {
      if (!supabase) throw new Error("Authentication service not available");
      const { data: { user } } = await supabase.auth.getUser();

      const res = await fetch("/api/analyzeResume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          options: { model: "gpt-4o-mini", temperature: 0.2 },
          userId: user?.id,
        }),
        signal: ac.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to analyze resume");
      }

      const data: Audit = await res.json();
      setAudit(data);
      setActiveTab("issues");
    } catch (e: any) {
      if (e.name === "AbortError") setError("Analysis cancelled");
      else setError(e.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
      setController(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "var(--score-excellent)";
    if (score >= 70) return "var(--score-good)";
    if (score >= 50) return "var(--score-average)";
    return "var(--score-needs-work)";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Average";
    return "Needs Work";
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] py-16">
      {/* Header */}
      <header className="max-w-6xl mx-auto text-center mb-12 px-4">
        <div className="inline-flex items-center justify-center h-14 w-14 bg-[var(--accent)] rounded-full mb-4 shadow-md">
          <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-black fill-none" strokeWidth="2">
            <path d="M4 2h10l6 6v14H4V2z" />
            <path d="M14 2v6h6" />
          </svg>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--accent)]">
          Resume Scanner
        </h1>
        <p className="mt-3 text-lg text-[var(--gray-300)] max-w-xl mx-auto leading-relaxed">
          Elevate your resume with AI-powered insights to make a lasting impression.
        </p>
      </header>

      {/* Quick Tips */}
      {showTips && (
        <div className="max-w-6xl mx-auto mb-12 px-4">
          <div className="bg-[var(--neutral-800)]/40 border border-[var(--neutral-700)] rounded-2xl p-6 relative shadow-lg">
            <button
              className="absolute top-4 right-4 text-[var(--gray-400)] hover:text-[var(--foreground)] transition-colors"
              onClick={() => setShowTips(false)}
              aria-label="Close tips"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-xl font-semibold text-[var(--yellow-300)] mb-4">
              Resume Optimization Tips
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-[var(--gray-300)]">
              {[
                "Use action verbs and quantify achievements for impact.",
                "Tailor your resume to match job-specific keywords.",
                "Ensure consistent formatting for a professional look.",
                "Highlight relevant skills and experiences upfront.",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[var(--yellow-300)] flex-shrink-0">✓</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Uploader */}
      <section className="max-w-6xl mx-auto px-4">
        <PlanChecker feature="resume_scan">
          <div className="bg-[var(--neutral-800)] rounded-2xl border border-[var(--neutral-700)] p-8 shadow-xl">
            <h2 className="text-2xl font-semibold text-[var(--gray-100)] mb-6">
              Upload Your Resume
            </h2>
            <ResumeUploader onResumeSubmit={sendToApi} />
          </div>
        </PlanChecker>
      </section>

      {/* Status */}
      <section className="max-w-6xl mx-auto mt-12 px-4" aria-live="polite" aria-busy={loading}>
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 bg-[var(--neutral-800)] rounded-2xl border border-[var(--neutral-700)] shadow-xl flex flex-col items-center gap-4"
            >
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-t-[var(--accent)] border-r-[var(--accent)] border-b-transparent border-l-transparent rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-[var(--gray-100)]">
                  Analyzing Resume...
                </h3>
                <p className="text-[var(--gray-400)] mt-2">
                  Our AI is scanning for optimization opportunities.
                </p>
              </div>
              {controller && (
                <button
                  onClick={() => controller.abort()}
                  className="mt-4 px-5 py-2 bg-[var(--red-900)] hover:bg-[var(--red-800)] text-[var(--red-300)] rounded-lg border border-[var(--red-800)] transition-colors font-medium"
                >
                  Cancel Analysis
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 bg-[var(--red-900)]/20 border border-[var(--red-800)] text-[var(--red-300)] rounded-2xl flex items-center justify-center mt-8 shadow-md"
              role="alert"
            >
              <svg className="h-5 w-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Feedback */}
      <AnimatePresence>
        {audit && (
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
            className="max-w-6xl mx-auto mt-12 px-4"
          >
            <div className="bg-[var(--neutral-800)] rounded-2xl border border-[var(--neutral-700)] shadow-xl overflow-hidden">
              {/* Header with Score */}
              <div className="bg-[var(--neutral-700)]/30 p-8 border-b border-[var(--neutral-700)]">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div ref={scoreRef} className="w-32 h-32 flex-shrink-0">
                    <CircularProgressbar
                      value={audit.score}
                      text={`${audit.score}`}
                      styles={buildStyles({
                        textSize: "28px",
                        pathColor: getScoreColor(audit.score),
                        textColor: getScoreColor(audit.score),
                        trailColor: "var(--trail-color)",
                        pathTransitionDuration: 0.8,
                      })}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-3xl font-bold text-[var(--gray-100)]">
                        Resume Score
                      </h2>
                      <span
                        className="px-4 py-1.5 rounded-full text-sm font-semibold"
                        style={{
                          backgroundColor: `${getScoreColor(audit.score)}20`,
                          color: getScoreColor(audit.score),
                        }}
                      >
                        {getScoreLabel(audit.score)}
                      </span>
                    </div>
                    <p className="text-[var(--gray-300)] leading-relaxed text-lg">
                      {audit.summary || (audit.score >= 85
                        ? "Outstanding resume! You're well-positioned to impress recruiters."
                        : audit.score >= 70
                          ? "Solid resume with minor areas for enhancement."
                          : audit.score >= 50
                            ? "Your resume needs key improvements to stand out."
                            : "Significant updates are needed for effectiveness.")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-[var(--neutral-700)] bg-[var(--neutral-700)]/10">
                <div className="flex max-w-full overflow-x-auto scrollbar-hidden px-4">
                  {[
                    { id: "issues", label: `Issues & Actions (${audit.issues.length})` },
                    { id: "strengths", label: `Strengths (${audit.strengths?.length || 0})` },
                    { id: "keywords", label: "Keywords" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      className={`px-6 py-4 text-sm font-semibold transition-colors relative ${
                        activeTab === tab.id
                          ? "text-[var(--accent)] after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-[var(--accent)]"
                          : "text-[var(--gray-400)] hover:text-[var(--gray-200)]"
                      }`}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-8">
                {activeTab === "issues" && (
                  <>
                    {audit.issues.length === 0 ? (
                      <div className="p-8 bg-[var(--green-900)]/10 border border-[var(--green-800)] text-[var(--green-300)] rounded-2xl text-center">
                        <svg className="h-10 w-10 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-xl font-semibold text-[var(--green-300)] mb-2">
                          No Issues Detected!
                        </h3>
                        <p>Your resume is optimized and ready to shine!</p>
                      </div>
                    ) : (
                      <ul className="space-y-6">
                        {audit.issues.map((issue, i) => (
                          <li key={i} role="listitem" className="animate-fadeIn">
                            <details className="group border border-[var(--neutral-700)] rounded-xl overflow-hidden">
                              <summary className="cursor-pointer flex items-center gap-4 p-5 bg-[var(--neutral-900)] hover:bg-[var(--neutral-800)] transition-colors">
                                <span className={`px-3 py-1 text-xs rounded-full border font-medium ${badgeColor[issue.severity]}`}>
                                  {issue.severity.toUpperCase()}
                                </span>
                                <span className="flex items-center gap-3">
                                  <span className="text-[var(--gray-400)] text-lg">
                                    {sectionIcons[issue.section as keyof typeof sectionIcons] || "📄"}
                                  </span>
                                  <span className="font-semibold text-[var(--gray-200)]">
                                    {issue.section}
                                  </span>
                                </span>
                                <span className="text-[var(--gray-300)] truncate flex-1 text-sm">
                                  {issue.text}
                                </span>
                                <svg className="w-5 h-5 text-[var(--gray-500)] group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              </summary>
                              <div className="p-6 space-y-4 bg-[var(--neutral-900)] border-t border-[var(--neutral-700)]">
                                {issue.line && (
                                  <div className="bg-[var(--neutral-700)]/30 p-4 rounded-lg border border-[var(--neutral-700)]">
                                    <p className="text-[var(--gray-400)] text-sm mb-2">Original Text:</p>
                                    <p className="text-[var(--gray-300)] italic">"{issue.line}"</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-[var(--gray-400)] text-sm mb-2">Issue:</p>
                                  <p className="text-[var(--gray-300)]">{issue.text}</p>
                                  {issue.reason && (
                                    <p className="mt-2 text-[var(--gray-400)] text-sm">{issue.reason}</p>
                                  )}
                                </div>
                                {audit.actions[i] && (
                                  <div className="bg-[var(--neutral-800)] p-5 rounded-lg border border-[var(--neutral-700)]">
                                    <div className="flex justify-between items-center mb-3">
                                      <h4 className="text-[var(--gray-200)] font-semibold">Suggested Improvement</h4>
                                      <button
                                        onClick={() => handleCopyText(audit.actions[i].rewrite)}
                                        className="p-2 hover:bg-[var(--neutral-700)] rounded-lg transition-colors"
                                        aria-label="Copy suggested action"
                                      >
                                        <svg className="h-5 w-5 text-[var(--gray-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                      </button>
                                    </div>
                                    <p className="text-[var(--gray-200)] leading-relaxed">{audit.actions[i].rewrite}</p>
                                    {audit.actions[i].improvement && (
                                      <p className="mt-3 text-[var(--gray-400)] text-sm">
                                        <span className="text-[var(--yellow-300)]">Why this works:</span>{" "}
                                        {audit.actions[i].improvement}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </details>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {activeTab === "strengths" && (
                  <>
                    {!audit.strengths || audit.strengths.length === 0 ? (
                      <div className="p-8 bg-[var(--neutral-800)]/20 border border-[var(--neutral-700)] rounded-2xl text-center">
                        <p className="text-[var(--gray-400)] text-lg">
                          No specific strengths identified yet. Keep refining your resume!
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-6">
                        {audit.strengths.map((strength, i) => (
                          <li key={i} className="bg-[var(--green-900)]/10 border border-[var(--green-800)]/30 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-xl">{sectionIcons[strength.section as keyof typeof sectionIcons] || "📄"}</span>
                              <h4 className="font-semibold text-[var(--green-400)] text-lg">{strength.section}</h4>
                            </div>
                            <p className="text-[var(--gray-200)] mb-2">{strength.text}</p>
                            <p className="text-[var(--gray-400)] text-sm">
                              <span className="text-[var(--green-400)]">Why this works:</span> {strength.reason}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {activeTab === "keywords" && (
                  <>
                    {!audit.keywords || audit.keywords.length === 0 ? (
                      <div className="p-8 bg-[var(--neutral-800)]/20 border border-[var(--neutral-700)] rounded-2xl text-center">
                        <p className="text-[var(--gray-400)] text-lg">
                          No keyword analysis available. Upload a resume to get started.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {audit.keywords.map((keyword, i) => (
                          <div key={i} className="border border-[var(--neutral-700)] rounded-xl overflow-hidden">
                            <div className="bg-[var(--neutral-700)]/30 p-4 font-semibold text-[var(--gray-200)] text-lg">
                              {keyword.category}
                            </div>
                            <div className="p-6">
                              <div className="mb-6">
                                <h4 className="text-sm text-[var(--gray-400)] mb-3 font-medium">Found Keywords</h4>
                                <div className="flex flex-wrap gap-3">
                                  {keyword.terms.map((term, j) => (
                                    <span
                                      key={j}
                                      className="px-3 py-1.5 bg-[var(--neutral-700)]/20 text-[var(--gray-200)] rounded-full border border-[var(--neutral-600)] text-sm font-medium"
                                    >
                                      {term}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {keyword.missing && keyword.missing.length > 0 && (
                                <div>
                                  <h4 className="text-sm text-[var(--gray-400)] mb-3 font-medium">Suggested Keywords</h4>
                                  <div className="flex flex-wrap gap-3">
                                    {keyword.missing.map((term, j) => (
                                      <span
                                        key={j}
                                        className="px-3 py-1.5 bg-[var(--yellow-900)]/10 text-[var(--yellow-400)] rounded-full border border-[var(--yellow-800)]/30 text-sm font-medium"
                                      >
                                        {term}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer with Tip */}
              <div className="border-t border-[var(--neutral-700)] p-6 bg-[var(--neutral-900)]/30">
                <p className="text-[var(--gray-400)] text-sm text-center">
                  <span className="text-[var(--accent)] font-semibold">Pro Tip:</span>{" "}
                  Recruiters scan resumes in 6–7 seconds. Optimize for clarity and impact!
                </p>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}