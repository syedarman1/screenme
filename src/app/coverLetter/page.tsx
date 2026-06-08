// src/app/coverLetter/page.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ResumeUploader from "../components/ResumeUploader";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { motion, AnimatePresence } from "framer-motion";
import PlanChecker from "../components/PlanChecker";
import { supabase } from "../lib/supabaseClient";

const TONES = [
  { id: "Professional", label: "Professional", desc: "Formal, achievement-focused",        free: true  },
  { id: "Enthusiastic", label: "Enthusiastic", desc: "Energetic, shows passion",           free: false },
  { id: "Concise",      label: "Concise",      desc: "Direct, punchy, 200 words",          free: false },
  { id: "Formal",       label: "Formal",       desc: "Gov / legal / executive",            free: false },
  { id: "Creative",     label: "Creative",     desc: "Narrative-led, memorable hook",      free: false },
] as const;

type Tone = (typeof TONES)[number]["id"];

export default function CoverLetterPage() {
  const [resumeText, setResumeText] = useState("");
  const [jobTitle, setJobTitle]     = useState("");
  const [company, setCompany]       = useState("");
  const [jobDesc, setJobDesc]       = useState("");
  const [tone, setTone]             = useState<Tone>("Professional");
  const [coverLetter, setCoverLetter] = useState("");
  const [wordCount, setWordCount]   = useState(0);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [isEditing, setIsEditing]   = useState(false);
  const [editText, setEditText]     = useState("");
  const [controller, setController] = useState<AbortController | null>(null);
  const [userPlan, setUserPlan]     = useState<string>("free");
  const [copied, setCopied]         = useState(false);
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
      if (data.jobTitle) setJobTitle(data.jobTitle);
      if (data.company)  setCompany(data.company);
      if (data.description) setJobDesc(data.description);
    } catch {
      setUrlError("Failed to fetch job posting. Paste the description manually.");
    } finally {
      setUrlLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) return;
      supabase!.from("user_plans").select("plan").eq("user_id", data.user.id).single()
        .then(({ data: pd }) => setUserPlan(pd?.plan || "free"));
    });
  }, []);

  const isPro = userPlan === "pro";

  const handleGenerate = useCallback(async (overrideTone?: Tone) => {
    if (!resumeText || !jobTitle || !company) {
      setError("Please fill in your resume, job title, and company name.");
      return;
    }
    const activeTone = overrideTone ?? tone;
    const ac = new AbortController();
    setController(ac);
    setLoading(true);
    setError(null);
    setIsEditing(false);

    try {
      if (!supabase) throw new Error("Authentication service not available");
      const { data: { user } } = await supabase.auth.getUser();

      const res = await fetch("/api/coverLetter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resumeText,
          jobTitle,
          company,
          jobDesc,
          tone: isPro ? activeTone : "Professional",
          userId: user?.id,
        }),
        signal: ac.signal,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate cover letter");
      if (!data.coverLetter) throw new Error("No cover letter returned");

      setCoverLetter(data.coverLetter);
      setWordCount(data.wordCount ?? data.coverLetter.split(/\s+/).filter(Boolean).length);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch (e: any) {
      if (e.name === "AbortError") setError("Generation cancelled.");
      else setError(e.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
      setController(null);
    }
  }, [resumeText, jobTitle, company, jobDesc, tone, isPro]);

  const saveEdit = () => { setCoverLetter(editText.trim()); setIsEditing(false); };
  const cancelEdit = () => {
    if (editText !== coverLetter && !confirm("Discard unsaved changes?")) return;
    setIsEditing(false);
  };

  const copyLetter = () => {
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadDOCX = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: coverLetter.split("\n").map((line) =>
          new Paragraph({ children: [new TextRun({ text: line })] })
        ),
      }],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `CoverLetter_${company.replace(/\s+/g, "_")}.docx`);
  };

  const canGenerate = !!resumeText && jobTitle.trim().length >= 3 && company.trim().length >= 2;

  return (
    <div className="min-h-screen bg-bg text-fg pt-16 pb-24 px-4">

      {/* Header */}
      <header className="max-w-2xl mx-auto text-center mb-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-[18px] bg-accent/[0.08] border border-border/15 mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-fg" strokeWidth="1.5">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h1 className="text-5xl font-semibold tracking-tight text-fg mb-3">
          Cover Letter Generator
        </h1>
        <p className="text-fg-muted text-lg leading-relaxed max-w-lg mx-auto">
          Upload your resume, pick a tone, and get a tailored, interview-ready cover letter in seconds.
        </p>
      </header>

      {/* Form */}
      <section className="max-w-2xl mx-auto">
        <PlanChecker feature="cover_letter">
          <div className="bg-white rounded-3xl border border-border shadow-sm p-8 space-y-7">

            {/* Resume */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-fg">Your Resume</h2>
                {resumeText && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Resume loaded
                  </span>
                )}
              </div>
              <ResumeUploader onResumeSubmit={setResumeText} />
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#f0f0f5]" /></div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-xs text-fg-subtle font-medium">role details</span>
              </div>
            </div>

            {/* URL Import */}
            <div>
              <p className="text-xs font-medium text-fg-subtle mb-2">Import from URL</p>
              <div className="flex items-center gap-2">
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
              {urlError && <p className="text-xs text-red-500 mt-1.5">{urlError}</p>}
              {!urlError && jobUrl && !urlLoading && jobTitle && (
                <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Auto-filled title, company, and description
                </p>
              )}
            </div>

            {/* Job Title + Company */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="jobTitle" className="block mb-1.5 text-sm font-semibold text-fg">
                  Job Title <span className="text-red-400">*</span>
                </label>
                <input
                  id="jobTitle"
                  className="w-full bg-bg p-3.5 rounded-xl border border-border-2 text-fg placeholder:text-fg-subtle focus:outline-none focus:border-border focus:ring-2 focus:ring-fg/10 text-sm transition-all"
                  placeholder="e.g., Senior Backend Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="company" className="block mb-1.5 text-sm font-semibold text-fg">
                  Company <span className="text-red-400">*</span>
                </label>
                <input
                  id="company"
                  className="w-full bg-bg p-3.5 rounded-xl border border-border-2 text-fg placeholder:text-fg-subtle focus:outline-none focus:border-border focus:ring-2 focus:ring-fg/10 text-sm transition-all"
                  placeholder="e.g., Stripe"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label htmlFor="jobDesc" className="block mb-1.5 text-sm font-semibold text-fg">
                Job Description
                <span className="ml-1.5 text-xs font-normal text-fg-subtle">— recommended for best results</span>
              </label>
              <textarea
                id="jobDesc"
                className="w-full bg-bg p-3.5 rounded-xl border border-border-2 text-fg placeholder:text-fg-subtle focus:outline-none focus:border-border focus:ring-2 focus:ring-fg/10 resize-none text-sm leading-relaxed transition-all"
                rows={4}
                placeholder="Paste the job description to tailor the letter to this specific role and company…"
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
              />
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#f0f0f5]" /></div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-xs text-fg-subtle font-medium">tone</span>
              </div>
            </div>

            {/* Tone Selector */}
            <div>
              {!isPro && (
                <p className="text-xs text-fg-subtle mb-3">
                  <span className="font-semibold text-fg">Pro</span> — unlock all 5 tones for every application style
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {TONES.map((t) => {
                  const isLocked   = !isPro && !t.free;
                  const isSelected = tone === t.id && !isLocked;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={isLocked}
                      onClick={() => !isLocked && setTone(t.id)}
                      className={`relative flex flex-col items-start px-4 py-3 rounded-xl border text-left transition-all ${
                        isLocked
                          ? "bg-bg text-fg-subtle border-[#e8e8ed] cursor-not-allowed"
                          : isSelected
                          ? "bg-accent text-white border-border shadow-sm"
                          : "bg-white text-fg border-border-2 hover:border-border/50 hover:bg-bg"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-sm font-semibold ${isLocked ? "text-fg-subtle" : isSelected ? "text-white" : "text-fg"}`}>
                          {t.label}
                        </span>
                        {isLocked && (
                          <svg className="w-3.5 h-3.5 text-fg-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0110 0v4" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-xs mt-0.5 ${isLocked ? "text-[#c8c8cc]" : isSelected ? "text-white/70" : "text-fg-subtle"}`}>
                        {t.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={() => handleGenerate()}
              disabled={loading || !canGenerate}
              className="w-full bg-accent hover:bg-accent-hover active:scale-[.98] py-3.5 rounded-2xl text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                  </svg>
                  Writing your letter…
                </>
              ) : coverLetter ? "Regenerate" : "Generate Cover Letter"}
            </button>
          </div>
        </PlanChecker>
      </section>

      {/* Status */}
      <div className="max-w-2xl mx-auto mt-5" aria-live="polite">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-10 bg-white rounded-3xl border border-border shadow-sm flex flex-col items-center gap-5">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-[3px] border-[#e8e8ed]" />
                <div className="absolute inset-0 rounded-full border-[3px] border-t-fg border-r-fg/20 border-b-transparent border-l-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="stroke-fg" strokeWidth="2">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-fg">Writing your cover letter…</p>
                <p className="text-fg-subtle text-sm mt-1">Crafting a tailored narrative from your resume</p>
              </div>
              {controller && (
                <button onClick={() => controller.abort()}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 text-sm font-medium transition-colors">
                  Cancel
                </button>
              )}
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

      {/* Letter Output */}
      <AnimatePresence>
        {coverLetter && !loading && (
          <motion.section
            ref={resultsRef}
            key="letter"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }}
            className="max-w-2xl mx-auto mt-6"
          >
            <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">

              {/* Header bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f5] bg-[#fafafa]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-accent/[0.08] border border-border/15 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-fg" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-fg text-sm truncate">{jobTitle} — {company}</p>
                    <p className="text-xs text-fg-subtle">{wordCount} words · {isPro ? tone : "Professional"} tone</p>
                  </div>
                </div>

                {!isEditing ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={copyLetter}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        copied
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-white text-fg-muted border-border-2 hover:border-border/40 hover:text-fg"
                      }`}
                    >
                      {copied ? (
                        <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Copied</>
                      ) : (
                        <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
                      )}
                    </button>
                    <button
                      onClick={downloadDOCX}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-fg-muted border border-border-2 hover:border-border/40 hover:text-fg transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      DOCX
                    </button>
                    <button
                      onClick={() => { setEditText(coverLetter); setIsEditing(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors">Save</button>
                    <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-fg-muted border border-border-2 hover:bg-bg transition-colors">Cancel</button>
                  </div>
                )}
              </div>

              {/* Letter body — rendered like actual letter paper */}
              <div className="px-10 py-8 max-w-2xl mx-auto">
                {isEditing ? (
                  <textarea
                    rows={22}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full bg-bg text-fg p-4 rounded-xl border border-border-2 focus:outline-none focus:ring-2 focus:ring-fg/10 focus:border-border resize-none text-sm leading-[1.8] font-sans transition-all"
                  />
                ) : (
                  <div className="text-fg text-[15px] leading-[1.9] whitespace-pre-wrap font-serif tracking-[0.01em]">
                    {coverLetter}
                  </div>
                )}
              </div>

              <div className="border-t border-[#f0f0f5] px-6 py-4 bg-[#fafafa]">
                <p className="text-xs text-fg-subtle text-center">
                  Personalize the opening with a specific detail about {company || "the company"} — referencing a product, recent news, or their mission — for maximum impact.
                </p>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
