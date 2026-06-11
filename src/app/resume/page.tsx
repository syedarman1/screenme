"use client";

import React, { useState, useRef } from "react";
import ResumeUploader from "../components/ResumeUploader";
import { motion, AnimatePresence } from "framer-motion";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import PlanChecker from "../components/PlanChecker";
import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabaseClient";
import { authFetch } from "../lib/authFetch";

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
  subscores?: {
    content: number;
    formatting: number;
    ats: number;
    keywords: number;
  };
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

type ActiveTab = "issues" | "strengths" | "keywords";

/* ── helpers ─────────────────────────────────────────────── */
function scoreColor(s: number) {
  if (s >= 85) return "var(--score-excellent)";
  if (s >= 70) return "var(--score-good)";
  if (s >= 50) return "var(--score-average)";
  return "var(--score-needs-work)";
}
function scoreLabel(s: number) {
  if (s >= 85) return "Excellent";
  if (s >= 70) return "Good";
  if (s >= 50) return "Fair";
  return "Needs Work";
}
function scoreBadge(s: number) {
  if (s >= 85) return "pill-success";
  if (s >= 70) return "bg-surface-2 text-fg border-border/20";
  if (s >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
  return "pill-danger";
}

const SEV_BORDER: Record<Severity, string> = {
  high:   "border-l-red-500",
  medium: "border-l-amber-400",
  low:    "border-l-emerald-500",
};
const SEV_BADGE: Record<Severity, string> = {
  high:   "pill-danger",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low:    "pill-success",
};
const SEV_DOT: Record<Severity, string> = {
  high:   "bg-red",
  medium: "bg-amber-400",
  low:    "bg-green",
};

/* ── CopyButton ───────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
        copied
          ? "pill-success border border-emerald-200"
          : "bg-bg text-fg-muted border border-border-2 hover:border-border hover:text-fg"
      }`}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

/* ── SubScoreBar ──────────────────────────────────────────── */
function SubScoreBar({ label, value }: { label: string; value: number }) {
  const c = scoreColor(value);
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-fg-muted font-medium">{label}</span>
        <span className="text-xs font-semibold" style={{ color: c }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: c }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────── */
export default function ResumeScreen() {
  const [audit, setAudit]     = useState<Audit | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [activeTab, setActiveTab]   = useState<ActiveTab>("issues");
  const [openIdx, setOpenIdx]       = useState<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const sendToApi = async (resume: string) => {
    if (!resume.trim()) return;
    const ac = new AbortController();
    setController(ac);
    setLoading(true);
    setError(null);
    setAudit(null);
    setOpenIdx(null);

    try {
      if (!supabase) throw new Error("Authentication service not available");
      const { data: { user } } = await supabase.auth.getUser();

      const res = await authFetch("/api/analyzeResume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          options: { model: "gpt-4o-mini", temperature: 0.2 },
        }),
        signal: ac.signal,
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to analyze resume");
      }

      const data: Audit = await res.json();
      setAudit(data);
      setActiveTab("issues");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch (e: any) {
      if (e.name === "AbortError") setError("Analysis cancelled.");
      else setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setController(null);
    }
  };

  /* derived counts */
  const highCount   = audit?.issues.filter(i => i.severity === "high").length   ?? 0;
  const medCount    = audit?.issues.filter(i => i.severity === "medium").length  ?? 0;
  const totalFound  = audit?.keywords?.reduce((n, k) => n + k.terms.length, 0)   ?? 0;
  const totalMissing = audit?.keywords?.reduce((n, k) => n + (k.missing?.length ?? 0), 0) ?? 0;

  const tabs: { id: ActiveTab; label: string; badge?: number }[] = [
    { id: "issues",    label: "Issues & Fixes",  badge: audit?.issues.length },
    { id: "strengths", label: "Strengths",        badge: audit?.strengths?.length },
    { id: "keywords",  label: "Keywords",         badge: audit ? totalFound + totalMissing : undefined },
  ];

  return (
    <div className="page-shell">
      <div className="page-inner-sm">
        <PageHeader
          label="Resume Scanner"
          title="Audit your resume"
          description="Get an instant AI-powered score, gaps, rewrites, and keywords in seconds."
        />

        <section>
        <PlanChecker feature="resume_scan">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-fg">Your Resume</h2>
              {audit && (
                <button
                  onClick={() => { setAudit(null); setError(null); }}
                  className="text-xs text-fg hover:underline font-medium"
                >
                  Scan another
                </button>
              )}
            </div>
            <ResumeUploader onResumeSubmit={(txt) => { setResumeText(txt); setError(null); }} />
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={() => sendToApi(resumeText)}
                disabled={loading || resumeText.trim().length < 200}
                className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Analyzing…" : "Analyze Resume"}
              </button>
              {resumeText.trim().length > 0 && resumeText.trim().length < 200 && (
                <p className="text-xs text-fg-muted">
                  At least 200 characters needed — {200 - resumeText.trim().length} to go.
                </p>
              )}
            </div>
          </div>
        </PlanChecker>
      </section>

      {/* ── Status states ───────────────────────────────── */}
      <div className="max-w-2xl mx-auto mt-6 space-y-4" aria-live="polite">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-surface rounded-lg border border-border shadow-sm p-10 flex flex-col items-center gap-5"
            >
              {/* Animated scan bars */}
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[3px] border-border" />
                <div className="absolute inset-0 rounded-full border-[3px] border-t-fg border-r-fg/20 border-b-transparent border-l-transparent animate-spin" />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="stroke-fg" strokeWidth="1.5">
                  <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold text-fg text-lg">Analyzing your resume…</p>
                <p className="text-fg-subtle text-sm mt-1">Scanning for improvements, keywords, and formatting issues.</p>
              </div>
              {controller && (
                <button
                  onClick={() => controller.abort()}
                  className="px-5 py-2 rounded-lg pill-danger text-sm font-medium hover:bg-red-bg transition-colors"
                >
                  Cancel
                </button>
              )}
            </motion.div>
          )}

          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={error === "Analysis cancelled." ? "flex items-start gap-3 p-4 rounded-lg bg-surface-2 border border-border text-fg-muted text-sm" : "alert-error"}
              role={error === "Analysis cancelled." ? "status" : "alert"}
            >
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Results ─────────────────────────────────────── */}
      <AnimatePresence>
        {audit && (
          <motion.div
            ref={resultsRef}
            key="results"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }}
            className="max-w-2xl mx-auto mt-8 space-y-4"
          >

            {/* ── Score card ──────────────────────────── */}
            <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
              <div className="p-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-7">

                  {/* Circular score */}
                  <div className="relative flex-shrink-0">
                    <div className="w-32 h-32">
                      <CircularProgressbar
                        value={audit.score}
                        text={`${audit.score}`}
                        styles={buildStyles({
                          textSize: "26px",
                          pathColor: scoreColor(audit.score),
                          textColor: "var(--fg)",
                          trailColor: "var(--trail-color)",
                          pathTransitionDuration: 1,
                        })}
                      />
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                      <span className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${scoreBadge(audit.score)}`}>
                        {scoreLabel(audit.score)}
                      </span>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <h2 className="text-2xl font-bold text-fg mb-2">Resume Score</h2>
                    <p className="text-fg-muted text-sm leading-relaxed mb-5">
                      {audit.summary || (
                        audit.score >= 85 ? "Outstanding — you're well-positioned to impress recruiters." :
                        audit.score >= 70 ? "Solid resume with a few areas worth polishing." :
                        audit.score >= 50 ? "Decent foundation — address the high-priority issues below to stand out." :
                        "Significant updates needed to pass ATS screening and catch recruiter attention."
                      )}
                    </p>

                    {/* Stat pills */}
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      {highCount > 0 && (
                        <span className="flex items-center gap-1.5 px-3 py-1 pill-danger rounded-full text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-red" />
                          {highCount} high priority
                        </span>
                      )}
                      {medCount > 0 && (
                        <span className="flex items-center gap-1.5 px-3 py-1 pill-warning rounded-full text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange" />
                          {medCount} medium
                        </span>
                      )}
                      {(audit.strengths?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-1.5 px-3 py-1 pill-success rounded-full text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green" />
                          {audit.strengths!.length} strengths
                        </span>
                      )}
                      {audit.metadata && (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-bg border border-border-2 rounded-full text-xs font-medium text-fg-muted">
                          {audit.metadata.sectionsFound} sections
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-scores */}
                {audit.subscores && (
                  <div className="mt-7 pt-6 border-t border-border grid grid-cols-2 gap-x-8 gap-y-4">
                    <SubScoreBar label="Content Quality"    value={audit.subscores.content} />
                    <SubScoreBar label="ATS Compatibility"  value={audit.subscores.ats} />
                    <SubScoreBar label="Formatting"         value={audit.subscores.formatting} />
                    <SubScoreBar label="Keyword Density"    value={audit.subscores.keywords} />
                  </div>
                )}
              </div>
            </div>

            {/* ── Analysis card ───────────────────────── */}
            <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">

              {/* Tabs */}
              <div className="flex border-b border-border px-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setOpenIdx(null); }}
                    className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                      activeTab === tab.id
                        ? "text-fg after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-accent"
                        : "text-fg-subtle hover:text-fg"
                    }`}
                  >
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs leading-none font-semibold ${
                        activeTab === tab.id
                          ? "bg-accent/10 text-fg"
                          : "bg-surface-2 text-fg-subtle"
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab body */}
              <div className="p-6">

                {/* ISSUES & FIXES */}
                {activeTab === "issues" && (
                  audit.issues.length === 0 ? (
                    <div className="py-12 flex flex-col items-center gap-3 text-center">
                      <div className="w-12 h-12 rounded-lg pill-success flex items-center justify-center">
                        <svg className="w-6 h-6 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="font-semibold text-fg">No issues found</p>
                      <p className="text-fg-subtle text-sm">Your resume looks clean and well-optimized.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {audit.issues.map((issue, i) => (
                        <div
                          key={i}
                          className={`rounded-lg border border-border border-l-4 overflow-hidden ${SEV_BORDER[issue.severity]}`}
                        >
                          {/* Row */}
                          <button
                            onClick={() => setOpenIdx(openIdx === i ? null : i)}
                            aria-expanded={openIdx === i}
                            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-bg transition-colors"
                          >
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${SEV_DOT[issue.severity]}`} />
                            <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${SEV_BADGE[issue.severity]}`}>
                              {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                            </span>
                            <span className="flex-shrink-0 text-xs font-medium text-fg-muted bg-bg px-2.5 py-0.5 rounded-full border border-border">
                              {issue.section}
                            </span>
                            <span className="text-fg text-sm truncate flex-1">{issue.text}</span>
                            <svg
                              className={`w-4 h-4 text-fg-subtle flex-shrink-0 transition-transform duration-200 ${openIdx === i ? "rotate-180" : ""}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Expanded */}
                          {openIdx === i && (
                            <div className="px-5 pb-5 space-y-4 border-t border-border">
                              {/* Original */}
                              {issue.line && (
                                <div className="mt-4 p-4 bg-bg rounded-lg border border-border">
                                  <p className="text-[10px] font-semibold text-fg-subtle uppercase tracking-widest mb-2">Original</p>
                                  <p className="text-fg text-sm leading-relaxed italic">"{issue.line}"</p>
                                </div>
                              )}

                              {/* Issue */}
                              <div>
                                <p className="text-[10px] font-semibold text-fg-subtle uppercase tracking-widest mb-1.5">Issue</p>
                                <p className="text-fg text-sm leading-relaxed">{issue.text}</p>
                                {issue.reason && <p className="mt-1 text-fg-subtle text-xs">{issue.reason}</p>}
                              </div>

                              {/* Suggested rewrite */}
                              {audit.actions[i] && (
                                <div className="p-4 bg-surface-2 rounded-lg border border-border/15">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-semibold text-fg uppercase tracking-widest">Suggested Rewrite</p>
                                    <CopyButton text={audit.actions[i].rewrite} />
                                  </div>
                                  <p className="text-fg text-sm leading-relaxed">{audit.actions[i].rewrite}</p>
                                  {audit.actions[i].improvement && (
                                    <p className="mt-3 text-fg-muted text-xs">
                                      <span className="font-semibold text-fg">Why it works: </span>
                                      {audit.actions[i].improvement}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* STRENGTHS */}
                {activeTab === "strengths" && (
                  !audit.strengths || audit.strengths.length === 0 ? (
                    <div className="py-12 flex flex-col items-center gap-3 text-center">
                      <p className="text-fg-subtle">No specific strengths identified yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {audit.strengths.map((s, i) => (
                        <div key={i} className="flex gap-4 p-5 pill-success rounded-lg">
                          <div className="icon-box mt-0.5">
                            <svg className="w-4 h-4 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-semibold px-2 py-0.5 pill-success rounded-full">
                                {s.section}
                              </span>
                            </div>
                            <p className="text-fg text-sm leading-relaxed">{s.text}</p>
                            <p className="mt-1.5 text-green text-xs">
                              <span className="font-semibold">Why it works: </span>{s.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* KEYWORDS */}
                {activeTab === "keywords" && (
                  !audit.keywords || audit.keywords.length === 0 ? (
                    <div className="py-12 flex flex-col items-center gap-3 text-center">
                      <p className="text-fg-subtle">No keyword data available.</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {audit.keywords.map((kw, i) => (
                        <div key={i}>
                          <div className="flex items-center gap-2 mb-3">
                            <h3 className="text-sm font-semibold text-fg">{kw.category}</h3>
                            <span className="text-xs text-fg-subtle">
                              {kw.terms.length} found
                              {kw.missing && kw.missing.length > 0 ? ` · ${kw.missing.length} suggested` : ""}
                            </span>
                          </div>

                          {kw.terms.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {kw.terms.map((t, j) => (
                                <span key={j} className="flex items-center gap-1 px-3 py-1 pill-success border border-emerald-200 rounded-full text-xs font-medium">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {kw.missing && kw.missing.length > 0 && (
                            <>
                              <p className="text-[10px] font-semibold text-fg-subtle uppercase tracking-widest mb-2">Consider adding</p>
                              <div className="flex flex-wrap gap-2">
                                {kw.missing.map((t, j) => (
                                  <span key={j} className="flex items-center gap-1 px-3 py-1 bg-surface-2 text-fg border border-border/20 rounded-full text-xs font-medium">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14M5 12h14" />
                                    </svg>
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}

                          {i < (audit.keywords?.length ?? 0) - 1 && (
                            <div className="mt-5 border-t border-border" />
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-bg border-t border-border">
                <p className="text-center text-xs text-fg-subtle">
                  <span className="font-semibold text-fg">Tip: </span>
                  Recruiters spend 6–7 seconds on a first pass. Lead with impact, quantify everything, and keep it to one page if you have under 10 years of experience.
                </p>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
