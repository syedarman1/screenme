// src/app/jobmatch/page.tsx
"use client";

import React, { useState, useCallback, useRef } from "react";
import ResumeUploader from "../components/ResumeUploader";
import { motion, AnimatePresence } from "framer-motion";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import PlanChecker from "../components/PlanChecker";
import { supabase } from "../lib/supabaseClient";

type ActiveTab = "matched" | "missing" | "gaps" | "actions";

type MatchResult = {
  matchScore: number;
  summary?: string;
  matchedSkills: string[];
  missingSkills: string[];
  gaps: string[];
  actions: string[];
};

const MIN_LEN = 50;

function scoreInfo(s: number) {
  if (s >= 80) return { color: "#34c759", label: "Strong Match",   badge: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  if (s >= 60) return { color: "#ff9f0a", label: "Decent Match",   badge: "bg-amber-50 text-amber-700 border border-amber-200" };
  if (s >= 40) return { color: "#525252", label: "Partial Match",  badge: "bg-surface-2 text-fg border border-border" };
  return        { color: "#ff3b30", label: "Low Match",    badge: "bg-red-50 text-red-700 border border-red-200" };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`shrink-0 p-1.5 rounded-lg transition-colors ${copied ? "text-emerald-600" : "text-fg-subtle hover:text-fg hover:bg-surface-2"}`}
      title="Copy"
    >
      {copied ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

export default function JobMatchPage() {
  const [resumeTxt, setResumeTxt]   = useState("");
  const [jdTxt, setJdTxt]           = useState("");
  const [result, setResult]         = useState<MatchResult | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<ActiveTab>("matched");
  const resultsRef                  = useRef<HTMLDivElement>(null);
  const [jobUrl, setJobUrl]         = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError]     = useState<string | null>(null);

  const parseUrl = async () => {
    if (!jobUrl.trim()) return;
    setUrlLoading(true);
    setUrlError(null);
    try {
      const res = await fetch("/api/parseJobUrl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setUrlError(data.error); return; }
      if (data.description) setJdTxt(data.description);
    } catch {
      setUrlError("Failed to fetch job posting. Paste the description manually.");
    } finally {
      setUrlLoading(false);
    }
  };

  const submit = useCallback(async () => {
    setError(null);
    if (resumeTxt.trim().length < MIN_LEN) { setError(`Resume must be at least ${MIN_LEN} characters.`); return; }
    if (jdTxt.trim().length < MIN_LEN)     { setError(`Job description must be at least ${MIN_LEN} characters.`); return; }

    setLoading(true);
    setResult(null);

    try {
      if (!supabase) throw new Error("Authentication service not available");
      const { data: { user } } = await supabase.auth.getUser();

      const r = await fetch("/api/jobMatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: resumeTxt, job: jdTxt, userId: user?.id }),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Unknown server error");
      setResult(data as MatchResult);
      setActiveTab("matched");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [resumeTxt, jdTxt]);

  const reset = () => { setResumeTxt(""); setJdTxt(""); setResult(null); setError(null); };

  const info  = result ? scoreInfo(result.matchScore) : null;
  const tabs: { id: ActiveTab; label: string; count: number }[] = result ? [
    { id: "matched", label: "Matched",  count: result.matchedSkills.length },
    { id: "missing", label: "Missing",  count: result.missingSkills.length },
    { id: "gaps",    label: "Gaps",     count: result.gaps.length },
    { id: "actions", label: "Actions",  count: result.actions.length },
  ] : [];

  return (
    <div className="min-h-screen bg-bg text-fg pt-16 pb-24 px-4">

      {/* Header */}
      <header className="max-w-2xl mx-auto text-center mb-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-[18px] bg-accent/[0.08] border border-border/15 mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-fg" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <h1 className="text-5xl font-semibold tracking-tight text-fg mb-3">
          Job Match Analyzer
        </h1>
        <p className="text-fg-muted text-lg leading-relaxed max-w-lg mx-auto">
          See exactly how well your resume aligns with a job — and get a specific action plan to close every gap.
        </p>
      </header>

      {/* Input form */}
      <section className="max-w-2xl mx-auto">
        <PlanChecker feature="job_match">
          <div className="bg-white rounded-3xl border border-border shadow-sm p-8 space-y-7">

            {/* Resume */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-fg">Your Resume</h2>
                {resumeTxt && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Resume loaded
                  </span>
                )}
              </div>
              <ResumeUploader onResumeSubmit={setResumeTxt} />
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#f0f0f5]" /></div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-xs text-fg-subtle font-medium">then</span>
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label htmlFor="jd-input" className="block mb-2 font-semibold text-fg text-sm">
                Job Description
                <span className="ml-1.5 text-xs font-normal text-fg-subtle">— paste a URL or the full posting</span>
              </label>

              {/* URL parser */}
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  <input
                    value={jobUrl}
                    onChange={e => setJobUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); parseUrl(); } }}
                    placeholder="Paste LinkedIn, Indeed, or Greenhouse URL..."
                    className="w-full bg-bg text-fg placeholder:text-fg-subtle pl-9 pr-3 py-2.5 rounded-xl border border-border-2 focus:outline-none focus:border-border focus:ring-2 focus:ring-fg/10 text-sm transition-all"
                  />
                </div>
                <button
                  onClick={parseUrl}
                  disabled={urlLoading || !jobUrl.trim()}
                  className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shrink-0"
                >
                  {urlLoading ? (
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  )}
                  {urlLoading ? "Parsing…" : "Import"}
                </button>
              </div>
              {urlError && (
                <p className="text-xs text-red-500 mb-2">{urlError}</p>
              )}

              <textarea
                id="jd-input"
                value={jdTxt}
                onChange={(e) => setJdTxt(e.target.value)}
                rows={7}
                placeholder="Or paste the full job description here — include responsibilities, requirements, and qualifications…"
                className="w-full bg-bg text-fg placeholder:text-fg-subtle p-4 rounded-2xl border border-border-2 focus:outline-none focus:border-border focus:ring-2 focus:ring-fg/10 resize-none text-sm leading-relaxed transition-all"
              />
              {jdTxt.length > 0 && (
                <p className="text-right text-xs text-fg-subtle mt-1">{jdTxt.length} characters</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                disabled={loading || !resumeTxt || jdTxt.trim().length < MIN_LEN}
                onClick={submit}
                className="flex-1 py-3.5 rounded-2xl text-white bg-accent font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-hover active:scale-[.98] transition-all flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                    </svg>
                    Analyzing…
                  </>
                ) : "Analyze Match"}
              </button>
              {(resumeTxt || jdTxt || result) && (
                <button
                  onClick={reset}
                  disabled={loading}
                  className="px-5 py-3.5 rounded-2xl bg-bg text-fg-muted font-semibold border border-[#e0e0e5] hover:bg-surface-2 transition-colors disabled:opacity-40 text-sm"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </PlanChecker>
      </section>

      {/* Status */}
      <div className="max-w-2xl mx-auto mt-5" aria-live="polite">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="p-10 bg-white rounded-3xl border border-border shadow-sm flex flex-col items-center gap-5">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-[3px] border-[#e8e8ed]" />
                <div className="absolute inset-0 rounded-full border-[3px] border-t-fg border-r-fg/20 border-b-transparent border-l-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stroke-fg" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="7" /><line x1="19" y1="19" x2="15" y2="15" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-fg">Analyzing your match…</p>
                <p className="text-fg-subtle text-sm mt-1">Comparing skills, experience, and requirements</p>
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

      {/* Results */}
      <AnimatePresence>
        {result && info && (
          <motion.div
            ref={resultsRef}
            key="results"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }}
            className="max-w-2xl mx-auto mt-6 space-y-4"
          >

            {/* Score card */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-7">

                {/* Score ring */}
                <div className="relative flex-shrink-0">
                  <div className="w-32 h-32">
                    <CircularProgressbar
                      value={result.matchScore}
                      text={`${result.matchScore}%`}
                      styles={buildStyles({
                        textSize: "22px",
                        pathColor: info.color,
                        textColor: "#171717",
                        trailColor: "#f0f0f5",
                        pathTransitionDuration: 1,
                      })}
                    />
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className={`px-3 py-0.5 rounded-full text-xs font-semibold ${info.badge}`}>
                      {info.label}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl font-bold text-fg mb-2">Match Score</h2>
                  <p className="text-fg-muted text-sm leading-relaxed mb-5">
                    {result.summary || (
                      result.matchScore >= 80 ? "Excellent alignment. Your resume is well-matched — focus on refining your top talking points before applying." :
                      result.matchScore >= 60 ? "Good foundation. A few targeted updates could significantly strengthen your application." :
                      result.matchScore >= 40 ? "Partial match. Review the gaps and missing skills, and tailor your resume before applying." :
                      "Significant gaps exist. Consider upskilling in the areas below or targeting roles that better fit your background."
                    )}
                  </p>

                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-medium text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {result.matchedSkills.length} matched
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 rounded-full text-xs font-medium text-red-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {result.missingSkills.length} missing
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-surface-2 border border-border/20 rounded-full text-xs font-medium text-fg">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      {result.actions.length} actions
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis card */}
            <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">

              {/* Tabs */}
              <div className="flex border-b border-[#f0f0f5] px-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                      activeTab === tab.id
                        ? "text-fg after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-accent"
                        : "text-fg-subtle hover:text-fg"
                    }`}
                  >
                    {tab.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold leading-none ${
                      activeTab === tab.id ? "bg-accent/10 text-fg" : "bg-[#f0f0f5] text-fg-subtle"
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="p-6">

                {/* Matched Skills */}
                {activeTab === "matched" && (
                  result.matchedSkills.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-fg-subtle">No matching skills detected. Try expanding your resume with more relevant experience.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-fg-muted mb-4">Skills and qualifications present in both your resume and the job description.</p>
                      <div className="flex flex-wrap gap-2">
                        {result.matchedSkills.map((skill, i) => (
                          <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-sm font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </>
                  )
                )}

                {/* Missing Skills */}
                {activeTab === "missing" && (
                  result.missingSkills.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-fg-subtle">No missing skills detected — great coverage!</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-fg-muted mb-4">Skills required by the job description that aren&apos;t visible in your resume. Add them if you have the experience.</p>
                      <div className="flex flex-wrap gap-2">
                        {result.missingSkills.map((skill, i) => (
                          <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-sm font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </>
                  )
                )}

                {/* Gaps */}
                {activeTab === "gaps" && (
                  result.gaps.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-fg-subtle">No significant gaps — strong alignment with this role!</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-fg-muted mb-4">Specific differences between what the role requires and what your resume shows.</p>
                      <ul className="space-y-3">
                        {result.gaps.map((gap, i) => (
                          <li key={i} className="flex items-start gap-3 p-4 bg-[#fafafa] border border-[#e8e8ed] rounded-2xl">
                            <div className="w-6 h-6 rounded-full bg-accent/10 border border-border/20 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-fg text-xs font-bold">{i + 1}</span>
                            </div>
                            <p className="text-fg text-sm leading-relaxed">{gap}</p>
                          </li>
                        ))}
                      </ul>
                    </>
                  )
                )}

                {/* Actions */}
                {activeTab === "actions" && (
                  result.actions.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-fg-subtle">No actions needed — you&apos;re already a strong match!</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-fg-muted mb-4">Specific resume edits to make before you apply. Copy any item to keep as a to-do.</p>
                      <ul className="space-y-2">
                        {result.actions.map((action, i) => (
                          <li key={i} className="flex items-start gap-3 p-4 bg-[#fafafa] border border-[#e8e8ed] rounded-2xl hover:border-border/30 hover:bg-surface-2 transition-colors group">
                            <div className="w-5 h-5 rounded border-2 border-border-2 group-hover:border-border shrink-0 mt-0.5 flex items-center justify-center transition-colors">
                              <svg className="w-3 h-3 text-fg opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <p className="text-fg text-sm leading-relaxed flex-1">{action}</p>
                            <CopyButton text={action} />
                          </li>
                        ))}
                      </ul>
                    </>
                  )
                )}
              </div>

              <div className="border-t border-[#f0f0f5] px-6 py-4 bg-[#fafafa]">
                <p className="text-xs text-fg-subtle text-center">
                  Tailor your resume to each application. Even a 10-point score improvement can double your callback rate.
                </p>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
