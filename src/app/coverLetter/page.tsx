// src/app/cover-letter/page.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import ResumeUploader from "../components/ResumeUploader";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import PlanChecker from "../components/PlanChecker";
import { supabase } from "../lib/supabaseClient";

const TONES = ["Professional", "Enthusiastic", "Concise"] as const;
type Tone = (typeof TONES)[number];

export default function CoverLetterPage() {
  const [resumeText, setResumeText] = useState<string>("");
  const [jobTitle, setJobTitle] = useState<string>("");
  const [company, setCompany] = useState<string>("");
  const [jobDesc, setJobDesc] = useState<string>("");
  const [tone, setTone] = useState<Tone>("Professional");
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>("");
  const [controller, setController] = useState<AbortController | null>(null);
  const [showTips, setShowTips] = useState(true);
  const [userPlan, setUserPlan] = useState<string>("free");
  const letterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (coverLetter && letterRef.current && !isEditing) {
      const rect = letterRef.current.getBoundingClientRect();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
      });
    }
  }, [coverLetter, isEditing]);

  // Check user plan
  useEffect(() => {
    const checkUserPlan = async () => {
      if (!supabase) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: planData } = await supabase
            .from('user_plans')
            .select('plan')
            .eq('user_id', user.id)
            .single();
          setUserPlan(planData?.plan || 'free');
        }
      } catch (error) {
        console.error('Error checking user plan:', error);
      }
    };
    checkUserPlan();
  }, []);

  const handleGenerate = async () => {
    if (!resumeText || !jobTitle || !company) {
      setError("Please fill in resume, job title, and company.");
      return;
    }

    const ac = new AbortController();
    setController(ac);
    setLoading(true);
    setError(null);

    try {
      // Get current user
      if (!supabase) {
        throw new Error("Authentication service not available");
      }
      const { data: { user } } = await supabase.auth.getUser();
      
      const res = await fetch("/api/coverLetter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resumeText,
          jobTitle,
          company,
          jobDesc,
          tone,
          userId: user?.id,
        }),
        signal: ac.signal,
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to generate cover letter");
      if (!data.coverLetter) throw new Error("No cover letter returned");

      setCoverLetter(data.coverLetter);
      setIsEditing(false);
    } catch (e: any) {
      if (e.name === "AbortError") setError("Generation cancelled");
      else setError(e.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
      setController(null);
    }
  };

  const startEdit = () => {
    setEditText(coverLetter);
    setIsEditing(true);
    setTimeout(() => {
      const textarea = document.querySelector("textarea");
      textarea?.focus();
    }, 0);
  };

  const saveEdit = () => {
    setCoverLetter(editText.trim());
    setIsEditing(false);
  };

  const cancelEdit = () => {
    if (editText !== coverLetter && !confirm("Discard unsaved changes?"))
      return;
    setIsEditing(false);
  };

  const downloadDOCX = async () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: coverLetter.split("\n").map(
            (line) =>
              new Paragraph({
                children: [new TextRun({ text: line })],
              })
          ),
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "CoverLetter.docx");
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] pt-16 pb-16">
      <header className="max-w-5xl mx-auto text-center mb-8 px-6">
        <div className="inline-flex items-center justify-center h-12 w-12 bg-[#0071e3]/[0.08] border border-[#0071e3]/20 rounded-2xl mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" className="stroke-[#0071e3] fill-none" strokeWidth="1.5">
            <polyline points="22,6 12,13 2,6" />
            <rect x="2" y="6" width="20" height="14" rx="2" ry="2" />
          </svg>
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#1d1d1f]">
          Cover Letter Generator
        </h1>
        <p className="mt-3 text-base text-[#6e6e73] max-w-2xl mx-auto">
          Upload your resume, enter role details, and get a tailored cover letter in seconds.
        </p>
      </header>

      {showTips && (
        <div className="max-w-5xl mx-auto mb-8 px-6">
          <div className="bg-white border border-black/[0.08] rounded-xl p-4 relative">
            <button
              className="absolute top-2 right-2 text-[#86868b] hover:text-[#6e6e73]"
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
            <h3 className="text-lg font-medium text-[#0071e3] mb-2">
              Quick Cover Letter Tips
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-[#6e6e73]">
              <li className="flex items-start gap-2">
                <span className="text-[#0071e3] flex-shrink-0">
                  ✓
                </span>
                <span>Address the letter to a specific person if possible</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0071e3] flex-shrink-0">
                  ✓
                </span>
                <span>Highlight relevant skills from your resume</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0071e3] flex-shrink-0">
                  ✓
                </span>
                <span>Show enthusiasm for the company and role</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0071e3] flex-shrink-0">
                  ✓
                </span>
                <span>Keep it concise and focused on the job</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      <section className="w-full max-w-5xl mx-auto px-6">
        <PlanChecker feature="cover_letter">
          <div className="bg-white rounded-xl border border-black/[0.08] p-6 shadow-xl space-y-6">
            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              Create Your Cover Letter
            </h2>
            <ResumeUploader onResumeSubmit={setResumeText} />

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="jobTitle"
                className="block mb-1 font-semibold text-[#1d1d1f]"
              >
                Job Title
              </label>
              <input
                id="jobTitle"
                className="w-full bg-[#f5f5f7] p-3 rounded border border-black/[0.08] text-[#1d1d1f] focus:ring-2 focus:outline-none focus:ring-[var(--accent)]"
                placeholder="e.g., Senior Backend Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                aria-required="true"
              />
            </div>
            <div>
              <label
                htmlFor="company"
                className="block mb-1 font-semibold text-[#1d1d1f]"
              >
                Company
              </label>
              <input
                id="company"
                className="w-full bg-[#f5f5f7] p-3 rounded border border-black/[0.08] text-[#1d1d1f] focus:ring-2 focus:outline-none focus:ring-[var(--accent)]"
                placeholder="e.g., Acme Corp"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                aria-required="true"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="jobDesc"
              className="block mb-1 font-semibold text-[#1d1d1f]"
            >
              Job Description (Optional)
            </label>
            <textarea
              id="jobDesc"
              className="w-full bg-[#f5f5f7] p-3 rounded border border-black/[0.08] text-[#1d1d1f] focus:ring-2 focus:outline-none focus:ring-[var(--accent)]"
              rows={4}
              placeholder="Paste the job description here…"
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {userPlan === 'pro' ? (
              // Pro users can select any tone
              TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    tone === t
                      ? "bg-[var(--accent)] text-black ring-2 ring-[var(--accent)]"
                      : "bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#ebebf0] focus:ring-2 focus:ring-[var(--accent)]"
                  }`}
                  aria-pressed={tone === t}
                >
                  {t}
                </button>
              ))
            ) : (
              // Free users can only use Professional tone
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg font-medium bg-[var(--accent)] text-black ring-2 ring-[var(--accent)]"
                  disabled
                >
                  Professional
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg font-medium bg-[#f5f5f7] text-[#86868b] cursor-not-allowed opacity-50"
                    disabled
                  >
                    Enthusiastic
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg font-medium bg-[#f5f5f7] text-[#86868b] cursor-not-allowed opacity-50"
                    disabled
                  >
                    Concise
                  </button>
                </div>
                <span className="text-sm text-[#86868b] ml-2">
                  (Upgrade to Pro for all tones)
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !resumeText || !jobTitle || !company}
            className="w-full bg-[var(--accent)] py-3 rounded-lg text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-xl transition-transform flex items-center justify-center"
            aria-disabled={loading || !resumeText || !jobTitle || !company}
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
              "Generate Cover Letter"
            )}
          </button>
        </div>
        </PlanChecker>
      </section>

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
              className="p-8 bg-white rounded-xl border border-black/[0.08] shadow-xl flex flex-col items-center gap-4"
            >
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-t-[#0071e3] border-r-[#0071e3] border-b-transparent border-l-transparent rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-medium text-[#1d1d1f]">
                  Generating your cover letter...
                </h3>
                <p className="text-[#86868b] mt-2">
                  Our AI is crafting a tailored cover letter for you
                </p>
              </div>
              {controller && (
                <button
                  onClick={() => controller.abort()}
                  className="mt-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-colors"
                >
                  Cancel Generation
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
              className="p-4 bg-red-500/8 border border-red-500/20 text-red-400 rounded-xl flex items-center justify-center mt-8"
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

      <AnimatePresence>
        {coverLetter && (
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
            className="w-full max-w-5xl mx-auto mt-8 px-6"
          >
            <div
              className="bg-white rounded-xl border border-black/[0.08] p-8 shadow-xl space-y-6"
              ref={letterRef}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-[#1d1d1f]">
                  Your Cover Letter
                </h2>
                {!isEditing ? (
                  <button
                    onClick={startEdit}
                    className="px-4 py-2 bg-[var(--accent)] text-black rounded-lg font-medium hover:-translate-y-1 hover:shadow-xl transition-transform"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="px-4 py-2 bg-[var(--accent)] text-black rounded-lg font-medium hover:-translate-y-1 hover:shadow-xl transition-transform"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-[#f5f5f7] text-[#6e6e73] rounded-lg font-medium hover:bg-[#ebebf0] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <textarea
                  rows={10}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-[#f5f5f7] text-[#1d1d1f] p-4 rounded border border-black/[0.08] focus:ring-2 focus:outline-none focus:ring-[var(--accent)]"
                  aria-label="Edit cover letter"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-[#1d1d1f]">
                  {coverLetter}
                </pre>
              )}

              {!isEditing && (
                <div className="flex gap-4">
                  <button
                    onClick={downloadDOCX}
                    className="px-4 py-2 bg-[var(--accent)] text-black rounded-lg font-medium hover:-translate-y-1 hover:shadow-xl transition-transform flex items-center"
                    aria-label="Download cover letter as DOCX"
                  >
                    <svg
                      className="h-5 w-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download DOCX
                  </button>
                </div>
              )}
              <div className="border-t border-black/[0.08] pt-4">
                <p className="text-[#86868b] text-sm text-center">
                  <span className="text-[#0071e3]">Pro Tip:</span>{" "}
                  Personalize your cover letter with specific details about the
                  company to stand out!
                </p>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
