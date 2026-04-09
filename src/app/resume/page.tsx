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
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-[#fdc806]/10 text-[#fdc806] border-[#fdc806]/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
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
    <div className="min-h-screen bg-black text-white py-16">
      {/* Header */}
      <header className="max-w-6xl mx-auto text-center mb-12 px-4">
        <div className="inline-flex items-center justify-center h-12 w-12 bg-[#fdc806]/10 border border-[#fdc806]/20 rounded-2xl mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" className="stroke-[#fdc806] fill-none" strokeWidth="1.5">
            <path d="M4 2h10l6 6v14H4V2z" />
            <path d="M14 2v6h6" />
          </svg>
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
          Resume Scanner
        </h1>
        <p className="mt-3 text-base text-[#52525b] max-w-xl mx-auto leading-relaxed">
          AI-powered insights to optimize your resume for ATS and recruiters.
        </p>
      </header>

      {/* Quick Tips */}
      {showTips && (
        <div className="max-w-6xl mx-auto mb-12 px-4">
          <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6 relative">
            <button
              className="absolute top-4 right-4 text-[#52525b] hover:text-[#a1a1aa] transition-colors"
              onClick={() => setShowTips(false)}
              aria-label="Close tips"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-sm font-semibold text-[#fdc806] mb-4 uppercase tracking-widest">
              Resume Optimization Tips
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-[#a1a1aa]">
              {[
                "Use action verbs and quantify achievements for impact.",
                "Tailor your resume to match job-specific keywords.",
                "Ensure consistent formatting for a professional look.",
                "Highlight relevant skills and experiences upfront.",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#fdc806] flex-shrink-0">✓</span>
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
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.07] p-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
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
              className="p-8 bg-[#0a0a0a] rounded-2xl border border-white/[0.07] flex flex-col items-center gap-4"
            >
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-t-[#fdc806] border-r-[#fdc806] border-b-transparent border-l-transparent rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white">
                  Analyzing Resume...
                </h3>
                <p className="text-[#71717a] mt-2">
                  Our AI is scanning for optimization opportunities.
                </p>
              </div>
              {controller && (
                <button
                  onClick={() => controller.abort()}
                  className="mt-4 px-5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-colors font-medium"
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
              className="p-6 bg-red-500/8 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mt-8"
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
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.07] overflow-hidden">
              {/* Header with Score */}
              <div className="bg-white/[0.03] p-8 border-b border-white/[0.07]">
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
                      <h2 className="text-3xl font-bold text-white">
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
                    <p className="text-[#a1a1aa] leading-relaxed text-lg">
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
              <div className="border-b border-white/[0.07] bg-white/[0.02]">
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
                          : "text-[#71717a] hover:text-white"
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
                      <div className="p-8 bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 rounded-2xl text-center">
                        <svg className="h-10 w-10 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-xl font-semibold text-emerald-400 mb-2">
                          No Issues Detected!
                        </h3>
                        <p>Your resume is optimized and ready to shine!</p>
                      </div>
                    ) : (
                      <ul className="space-y-6">
                        {audit.issues.map((issue, i) => (
                          <li key={i} role="listitem" className="animate-fadeIn">
                            <details className="group border border-white/[0.07] rounded-xl overflow-hidden">
                              <summary className="cursor-pointer flex items-center gap-4 p-5 bg-black/50 hover:bg-[#0a0a0a] transition-colors">
                                <span className={`px-3 py-1 text-xs rounded-full border font-medium ${badgeColor[issue.severity]}`}>
                                  {issue.severity.toUpperCase()}
                                </span>
                                <span className="flex items-center gap-3">
                                  <span className="text-[#71717a] text-lg">
                                    {sectionIcons[issue.section as keyof typeof sectionIcons] || "📄"}
                                  </span>
                                  <span className="font-semibold text-white">
                                    {issue.section}
                                  </span>
                                </span>
                                <span className="text-[#a1a1aa] truncate flex-1 text-sm">
                                  {issue.text}
                                </span>
                                <svg className="w-5 h-5 text-[#52525b] group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              </summary>
                              <div className="p-6 space-y-4 bg-black/50 border-t border-white/[0.07]">
                                {issue.line && (
                                  <div className="bg-white/[0.03] p-4 rounded-lg border border-white/[0.07]">
                                    <p className="text-[#71717a] text-sm mb-2">Original Text:</p>
                                    <p className="text-[#a1a1aa] italic">"{issue.line}"</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-[#71717a] text-sm mb-2">Issue:</p>
                                  <p className="text-[#a1a1aa]">{issue.text}</p>
                                  {issue.reason && (
                                    <p className="mt-2 text-[#71717a] text-sm">{issue.reason}</p>
                                  )}
                                </div>
                                {audit.actions[i] && (
                                  <div className="bg-[#0a0a0a] p-5 rounded-lg border border-white/[0.07]">
                                    <div className="flex justify-between items-center mb-3">
                                      <h4 className="text-white font-semibold">Suggested Improvement</h4>
                                      <button
                                        onClick={() => handleCopyText(audit.actions[i].rewrite)}
                                        className="p-2 hover:bg-white/[0.07] rounded-lg transition-colors"
                                        aria-label="Copy suggested action"
                                      >
                                        <svg className="h-5 w-5 text-[#71717a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                      </button>
                                    </div>
                                    <p className="text-white leading-relaxed">{audit.actions[i].rewrite}</p>
                                    {audit.actions[i].improvement && (
                                      <p className="mt-3 text-[#71717a] text-sm">
                                        <span className="text-[#fdc806]">Why this works:</span>{" "}
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
                      <div className="p-8 bg-[#0a0a0a]/20 border border-white/[0.07] rounded-2xl text-center">
                        <p className="text-[#71717a] text-lg">
                          No specific strengths identified yet. Keep refining your resume!
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-6">
                        {audit.strengths.map((strength, i) => (
                          <li key={i} className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-xl">{sectionIcons[strength.section as keyof typeof sectionIcons] || "📄"}</span>
                              <h4 className="font-semibold text-emerald-400 text-lg">{strength.section}</h4>
                            </div>
                            <p className="text-white mb-2">{strength.text}</p>
                            <p className="text-[#71717a] text-sm">
                              <span className="text-emerald-400">Why this works:</span> {strength.reason}
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
                      <div className="p-8 bg-[#0a0a0a]/20 border border-white/[0.07] rounded-2xl text-center">
                        <p className="text-[#71717a] text-lg">
                          No keyword analysis available. Upload a resume to get started.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {audit.keywords.map((keyword, i) => (
                          <div key={i} className="border border-white/[0.07] rounded-xl overflow-hidden">
                            <div className="bg-white/[0.03] p-4 font-semibold text-white text-lg">
                              {keyword.category}
                            </div>
                            <div className="p-6">
                              <div className="mb-6">
                                <h4 className="text-sm text-[#71717a] mb-3 font-medium">Found Keywords</h4>
                                <div className="flex flex-wrap gap-3">
                                  {keyword.terms.map((term, j) => (
                                    <span
                                      key={j}
                                      className="px-3 py-1.5 bg-white/[0.04] text-white rounded-full border border-white/[0.1] text-sm font-medium"
                                    >
                                      {term}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {keyword.missing && keyword.missing.length > 0 && (
                                <div>
                                  <h4 className="text-sm text-[#71717a] mb-3 font-medium">Suggested Keywords</h4>
                                  <div className="flex flex-wrap gap-3">
                                    {keyword.missing.map((term, j) => (
                                      <span
                                        key={j}
                                        className="px-3 py-1.5 bg-[#fdc806]/10 text-[#fdc806] rounded-full border border-[#fdc806]/20 text-sm font-medium"
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
              <div className="border-t border-white/[0.07] p-6 bg-black/50/30">
                <p className="text-[#71717a] text-sm text-center">
                  <span className="text-[#fdc806] font-semibold">Pro Tip:</span>{" "}
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