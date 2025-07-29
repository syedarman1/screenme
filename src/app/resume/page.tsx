// src/app/resume/page.tsx
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
  const [activeTab, setActiveTab] = useState<
    "issues" | "strengths" | "keywords"
  >("issues");
  const [showTips, setShowTips] = useState(true);
  const scoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (audit?.score && audit.score >= 85 && scoreRef.current) {
      const rect = scoreRef.current.getBoundingClientRect();
      confetti({
        particleCount: 100,
        spread: 70,
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
      // Get current user
      if (!supabase) {
        throw new Error("Authentication service not available");
      }
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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-16 pb-16">
      {/* Header */}
      <header className="max-w-5xl mx-auto text-center mb-8 px-6">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-[var(--accent)] rounded-xl flex items-center justify-center shadow-lg">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              className="stroke-black fill-none"
              strokeWidth="2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M4 2h10l6 6v14H4V2z" />
              <path d="M14 2v6h6" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--accent)]">
          Resume Scanner
        </h1>
        <p className="mt-3 text-lg text-[var(--gray-300)] max-w-2xl mx-auto">
          Get expert feedback on your resume with our AI-powered analysis tool.
          Optimize your resume to stand out from the competition.
        </p>
      </header>

      {/* Quick Tips */}
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
              Quick Resume Tips
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-[var(--gray-300)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--yellow-300)] flex-shrink-0">✓</span>
                <span>Use strong action verbs and quantify achievements</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--yellow-300)] flex-shrink-0">✓</span>
                <span>Tailor your resume to the specific job description</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--yellow-300)] flex-shrink-0">✓</span>
                <span>Keep formatting consistent and easy to scan</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--yellow-300)] flex-shrink-0">✓</span>
                <span>Include keywords relevant to your industry</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Uploader */}
      <section className="w-full max-w-5xl mx-auto px-6">
        <PlanChecker feature="resume_scan">
          <div className="bg-[var(--neutral-800)] rounded-xl border border-[var(--neutral-700)] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-[var(--gray-200)] mb-4">
              Upload Your Resume
            </h2>
            <ResumeUploader onResumeSubmit={sendToApi} />
          </div>
        </PlanChecker>
      </section>

      {/* Status */}
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
                <h3 className="text-xl font-medium text-[var(--gray-200)]">
                  Analyzing your resume...
                </h3>
                <p className="text-[var(--gray-400)] mt-2">
                  Our AI is reviewing your resume for improvements
                </p>
              </div>
              {controller && (
                <button
                  onClick={() => controller.abort()}
                  className="mt-2 px-4 py-2 bg-[var(--red-900)]/50 hover:bg-[var(--red-800)] text-[var(--red-300)] rounded-lg border border-[var(--red-800)] transition-colors"
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

      {/* Feedback */}
      <AnimatePresence>
        {audit && (
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
            className="w-full max-w-5xl mx-auto mt-8 px-6"
          >
            <div className="bg-[var(--neutral-800)] rounded-xl border border-[var(--neutral-700)] shadow-xl overflow-hidden">
              {/* Header with Score */}
              <div className="bg-[var(--neutral-700)]/50 p-6 border-b border-[var(--neutral-700)]">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  {/* Score Circle */}
                  <div ref={scoreRef} className="w-36 h-36 flex-shrink-0">
                    <CircularProgressbar
                      value={audit.score}
                      text={`${audit.score}`}
                      styles={buildStyles({
                        textSize: "24px",
                        pathColor: getScoreColor(audit.score),
                        textColor: getScoreColor(audit.score),
                        trailColor: "var(--trail-color)",
                      })}
                    />
                  </div>
                  {/* Summary */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-2xl font-bold text-[var(--gray-100)]">
                        Resume Score
                      </h2>
                      <span
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: `${getScoreColor(audit.score)}30`,
                          color: getScoreColor(audit.score),
                        }}
                      >
                        {getScoreLabel(audit.score)}
                      </span>
                    </div>
                    {audit.summary ? (
                      <p className="text-[var(--gray-300)] leading-relaxed">
                        {audit.summary}
                      </p>
                    ) : (
                      <p className="text-[var(--gray-300)] leading-relaxed">
                        {audit.score >= 85
                          ? "Excellent work! Your resume appears to be well-optimized."
                          : audit.score >= 70
                          ? "Good job! Your resume is solid but has some room for improvement."
                          : audit.score >= 50
                          ? "Your resume needs attention in key areas to be competitive."
                          : "Your resume requires significant improvement to be effective."}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-[var(--neutral-700)]">
                <div className="flex overflow-x-auto">
                  <button
                    className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                      activeTab === "issues"
                        ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                        : "text-[var(--gray-400)] hover:text-[var(--gray-300)]"
                    }`}
                    onClick={() => setActiveTab("issues")}
                  >
                    Issues & Actions ({audit.issues.length})
                  </button>
                  <button
                    className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                      activeTab === "strengths"
                        ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                        : "text-[var(--gray-400)] hover:text-[var(--gray-300)]"
                    }`}
                    onClick={() => setActiveTab("strengths")}
                  >
                    Strengths ({audit.strengths?.length || 0})
                  </button>
                  <button
                    className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                      activeTab === "keywords"
                        ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                        : "text-[var(--gray-400)] hover:text-[var(--gray-300)]"
                    }`}
                    onClick={() => setActiveTab("keywords")}
                  >
                    Keywords
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "issues" && (
                  <>
                    {audit.issues.length === 0 ? (
                      <div className="p-6 bg-[var(--green-900)]/20 border border-[var(--green-800)] text-[var(--green-300)] rounded-lg text-center">
                        <svg
                          className="h-12 w-12 mx-auto mb-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <h3 className="text-xl font-medium text-[var(--green-300)] mb-1">
                          No issues found!
                        </h3>
                        <p>
                          Your resume appears to be well-optimized. Great job!
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-4" role="list">
                        {audit.issues.map((issue, i) => (
                          <li
                            key={i}
                            role="listitem"
                            className="animate-fadeIn"
                          >
                            <details className="group border border-[var(--neutral-700)] rounded-lg">
                              <summary className="cursor-pointer flex items-center gap-3 p-4 bg-[var(--neutral-900)] hover:bg-[var(--neutral-800)] transition-colors">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full border ${
                                    badgeColor[issue.severity]
                                  }`}
                                >
                                  {issue.severity.toUpperCase()}
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="text-[var(--gray-400)]">
                                    {sectionIcons[
                                      issue.section as keyof typeof sectionIcons
                                    ] || "📄"}
                                  </span>
                                  <span className="font-medium text-[var(--gray-200)]">
                                    {issue.section}
                                  </span>
                                </span>
                                <span className="text-[var(--gray-300)] truncate flex-1">
                                  {issue.text}
                                </span>
                                <svg
                                  className="w-5 h-5 text-[var(--gray-500)] group-open:rotate-180 transition-transform"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </summary>
                              <div className="p-4 space-y-4 bg-[var(--neutral-900)] border-t border-[var(--neutral-700)]">
                                {issue.line && (
                                  <div className="bg-[var(--neutral-700)]/50 p-3 rounded border border-[var(--neutral-700)]">
                                    <p className="text-[var(--gray-400)] text-sm mb-1">
                                      Original text:
                                    </p>
                                    <p className="text-[var(--gray-300)] italic">
                                      "{issue.line}"
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-[var(--gray-400)] text-sm mb-1">
                                    Issue:
                                  </p>
                                  <p className="text-[var(--gray-300)]">{issue.text}</p>
                                  {issue.reason && (
                                    <p className="mt-2 text-[var(--gray-400)] text-sm">
                                      {issue.reason}
                                    </p>
                                  )}
                                </div>
                                {audit.actions[i] && (
                                  <div className="mt-4 bg-[var(--neutral-800)] p-4 rounded-lg border border-[var(--neutral-700)]">
                                    <div className="flex justify-between items-center mb-2">
                                      <h4 className="text-[var(--gray-300)] font-medium">
                                        Suggested Improvement
                                      </h4>
                                      <button
                                        onClick={() =>
                                          handleCopyText(
                                            audit.actions[i].rewrite
                                          )
                                        }
                                        className="p-1 hover:bg-[var(--neutral-700)] rounded-lg transition-colors"
                                        aria-label="Copy suggested action"
                                      >
                                        <svg
                                          className="h-5 w-5 text-[var(--gray-400)]"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                          />
                                        </svg>
                                      </button>
                                    </div>
                                    <p className="text-[var(--gray-200)] leading-relaxed">
                                      {audit.actions[i].rewrite}
                                    </p>
                                    {audit.actions[i].improvement && (
                                      <p className="mt-2 text-[var(--gray-400)] text-sm">
                                        <span className="text-[var(--yellow-300)]">
                                          Why this works:
                                        </span>{" "}
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
                      <div className="p-6 bg-[var(--neutral-800)]/30 border border-[var(--neutral-700)] rounded-lg text-center">
                        <p className="text-[var(--gray-400)]">
                          No specific strengths were identified in your resume.
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-4">
                        {audit.strengths.map((strength, i) => (
                          <li
                            key={i}
                            className="bg-[var(--green-900)]/20 border border-[var(--green-800)]/40 rounded-lg p-4"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">
                                {sectionIcons[
                                  strength.section as keyof typeof sectionIcons
                                ] || "📄"}
                              </span>
                              <h4 className="font-medium text-[var(--green-400)]">
                                {strength.section}
                              </h4>
                            </div>
                            <p className="text-[var(--gray-200)] mb-2">
                              {strength.text}
                            </p>
                            <p className="text-[var(--gray-400)] text-sm">
                              <span className="text-[var(--green-400)]">
                                Why this works:{" "}
                              </span>
                              {strength.reason}
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
                      <div className="p-6 bg-[var(--neutral-800)]/30 border border-[var(--neutral-700)] rounded-lg text-center">
                        <p className="text-[var(--gray-400)]">
                          No keyword analysis is available for your resume.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {audit.keywords.map((keyword, i) => (
                          <div
                            key={i}
                            className="border border-[var(--neutral-700)] rounded-lg overflow-hidden"
                          >
                            <div className="bg-[var(--neutral-700)]/50 p-3 font-medium text-[var(--gray-200)]">
                              {keyword.category}
                            </div>
                            <div className="p-4">
                              <div className="mb-4">
                                <h4 className="text-sm text-[var(--gray-400)] mb-2">
                                  Found Keywords
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {keyword.terms.map((term, j) => (
                                    <span
                                      key={j}
                                      className="px-2 py-1 bg-[var(--neutral-700)]/30 text-[var(--gray-200)] rounded border border-[var(--neutral-600)] text-sm"
                                    >
                                      {term}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {keyword.missing &&
                                keyword.missing.length > 0 && (
                                  <div>
                                    <h4 className="text-sm text-[var(--gray-400)] mb-2">
                                      Suggested Keywords
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {keyword.missing.map((term, j) => (
                                        <span
                                          key={j}
                                          className="px-2 py-1 bg-[var(--yellow-900)]/20 text-[var(--yellow-400)] rounded border border-[var(--yellow-800)]/40 text-sm"
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

              {/* Footer with tip */}
              <div className="border-t border-[var(--neutral-700)] p-4 bg-[var(--neutral-900)]/50">
                <p className="text-[var(--gray-400)] text-sm text-center">
                  <span className="text-[var(--accent)]">Pro Tip:</span>{" "}
                  Recruiters spend an average of just 6–7 seconds scanning your
                  resume. Make every word count!
                </p>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}