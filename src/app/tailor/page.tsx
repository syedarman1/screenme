"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import ResumeUploader from "../components/ResumeUploader";
import { motion, AnimatePresence } from "framer-motion";
import PlanChecker from "../components/PlanChecker";
import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabaseClient";

export default function TailorPage() {
  const [resumeTxt, setResumeTxt]         = useState("");
  const [jdTxt, setJdTxt]                 = useState("");
  const [tailored, setTailored]           = useState("");
  const [wordCount, setWordCount]         = useState(0);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [userId, setUserId]               = useState<string | null>(null);
  const [copied, setCopied]               = useState(false);
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);
  const [saveName, setSaveName]           = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const resultsRef                        = useRef<HTMLDivElement>(null);

  // URL parser state
  const [jobUrl, setJobUrl]       = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError]   = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

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

  const handleTailor = useCallback(async () => {
    if (resumeTxt.trim().length < 50) { setError("Resume must be at least 50 characters."); return; }
    if (jdTxt.trim().length < 30)     { setError("Job description must be at least 30 characters."); return; }

    setLoading(true);
    setError(null);
    setTailored("");
    setSaved(false);
    setShowSaveInput(false);

    try {
      const res = await fetch("/api/tailorResume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: resumeTxt, job: jdTxt, userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to tailor resume.");
      setTailored(data.tailoredResume);
      setWordCount(data.wordCount ?? 0);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [resumeTxt, jdTxt]);

  const copyResume = () => {
    navigator.clipboard.writeText(tailored);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveToResumes = async () => {
    if (!userId || !tailored) return;
    const name = saveName.trim() || "Tailored Resume";
    setSaving(true);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ name, content: tailored }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      setSaved(true);
      setShowSaveInput(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setResumeTxt(""); setJdTxt(""); setTailored(""); setError(null);
    setSaved(false); setShowSaveInput(false); setJobUrl(""); setUrlError(null);
  };

  return (
    <div className="page-shell">
      <div className="page-inner-sm">
        <PageHeader
          label="Resume Tailor"
          title="Match any job description"
          description="Rewrite your resume to fit a role, then save it to your library."
        />

        <section>
        <PlanChecker feature="resume_tailor">
        <div className="card p-6 space-y-6">

          {/* Resume */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-fg">Your Resume</h2>
              {resumeTxt && (
                <span className="text-xs text-green font-medium flex items-center gap-1">
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
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-surface text-xs text-fg-subtle font-medium">Target role</span>
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
                  className="w-full bg-bg text-fg placeholder:text-fg-subtle pl-9 pr-3 py-2.5 rounded-lg border border-border-2 focus:outline-none focus:border-border focus:ring-2 focus:ring-fg/10 text-sm transition-all"
                />
              </div>
              <button
                onClick={parseUrl}
                disabled={urlLoading || !jobUrl.trim()}
                className="btn btn-primary px-4 py-2.5 text-sm disabled:opacity-40 shrink-0"
              >
                {urlLoading ? (
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                )}
                {urlLoading ? "Parsing…" : "Import"}
              </button>
            </div>
            {urlError && <p className="text-xs text-red mb-2">{urlError}</p>}

            <textarea
              id="jd-input"
              value={jdTxt}
              onChange={(e) => setJdTxt(e.target.value)}
              rows={7}
              placeholder="Or paste the full job description here — include responsibilities, requirements, and qualifications…"
              className="textarea"
            />
            {jdTxt.length > 0 && (
              <p className="text-right text-xs text-fg-subtle mt-1">{jdTxt.length} characters</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              disabled={loading || !resumeTxt || jdTxt.trim().length < 30}
              onClick={handleTailor}
              className="btn btn-primary flex-1 py-3 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                  </svg>
                  Tailoring…
                </>
              ) : tailored ? "Re-tailor" : "Tailor Resume"}
            </button>
            {(resumeTxt || jdTxt || tailored) && (
              <button
                onClick={reset}
                disabled={loading}
                className="btn btn-secondary px-5 py-3 disabled:opacity-40"
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
            <motion.div key="loading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="card p-10 flex flex-col items-center gap-5">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-[3px] border-border" />
                <div className="absolute inset-0 rounded-full border-[3px] border-t-fg border-r-fg/20 border-b-transparent border-l-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="stroke-fg" strokeWidth="2">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-fg">Tailoring your resume…</p>
                <p className="text-fg-subtle text-sm mt-1">Rewriting to maximize relevance for this role</p>
              </div>
            </motion.div>
          )}
          {error && !loading && (
            <motion.div key="error" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="alert-error" role="alert">
              <svg className="h-5 w-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Output */}
      <AnimatePresence>
        {tailored && !loading && (
          <motion.section
            ref={resultsRef}
            key="output"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }}
            className="max-w-2xl mx-auto mt-6"
          >
            <div className="card overflow-hidden">

              {/* Header bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border/15 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-fg" strokeWidth="2">
                      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-fg text-sm">Tailored Resume</p>
                    <p className="text-xs text-fg-subtle">{wordCount} words</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Copy */}
                  <button
                    onClick={copyResume}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      copied
                        ? "pill-success"
                        : "bg-surface text-fg-muted border-border-2 hover:border-border/40 hover:text-fg"
                    }`}
                  >
                    {copied ? (
                      <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Copied</>
                    ) : (
                      <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
                    )}
                  </button>

                  {/* Save to My Resumes */}
                  {userId && !saved && !showSaveInput && (
                    <button
                      onClick={() => { setSaveName(""); setShowSaveInput(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      Save to My Resumes
                    </button>
                  )}
                  {saved && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold pill-success border border-emerald-200">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Saved
                    </span>
                  )}
                </div>
              </div>

              {/* Save name input (inline) */}
              {showSaveInput && (
                <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-surface-2">
                  <input
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveToResumes(); }}
                    placeholder="Resume name (e.g. Frontend Engineer v2)"
                    autoFocus
                    className="flex-1 px-3 py-2 rounded-lg border border-border/20 bg-surface text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-fg/10"
                  />
                  <button
                    onClick={saveToResumes}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setShowSaveInput(false)}
                    className="px-3 py-2 rounded-lg text-xs text-fg-muted hover:bg-bg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Resume body */}
              <div className="px-10 py-8 max-w-2xl mx-auto">
                <div className="text-fg text-sm leading-[1.8] whitespace-pre-wrap font-mono">
                  {tailored}
                </div>
              </div>

              <div className="border-t border-border px-6 py-4 bg-bg">
                <p className="text-xs text-fg-subtle text-center">
                  Review the tailored version carefully — all facts are preserved from your original, but verify before submitting.
                </p>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
