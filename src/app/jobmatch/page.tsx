// src/app/job-match/page.tsx
"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import ResumeUploader from "../components/ResumeUploader";
import { motion, AnimatePresence } from "framer-motion";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import confetti from "canvas-confetti";
import PlanChecker from "../components/PlanChecker";
import { supabase } from "../lib/supabaseClient";

type MatchResult = {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  gaps: string[];
  actions: string[];
};

const MIN_INPUT_LENGTH = 50;
const STOP_WORDS = new Set([
  "with",
  "that",
  "the",
  "and",
  "for",
  "you",
  "will",
  "from",
]);

export default function JobMatchPage() {
  const [resumeTxt, setResumeTxt] = useState("");
  const [jdTxt, setJdTxt] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "matched" | "missing" | "gaps" | "actions"
  >("matched");
  const scoreRef = useRef<HTMLDivElement>(null);

  const resumeWords = useMemo(() => {
    return Array.from(
      new Set(
        resumeTxt
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
      )
    );
  }, [resumeTxt]);

  useEffect(() => {
    if (result?.matchScore && result.matchScore >= 80 && scoreRef.current) {
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
  }, [result?.matchScore]);

  const resetForm = useCallback(() => {
    setResumeTxt("");
    setJdTxt("");
    setResult(null);
    setError(null);
    setActiveTab("matched");
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (resumeTxt.trim().length < MIN_INPUT_LENGTH) {
      setError(`Resume must be at least ${MIN_INPUT_LENGTH} characters.`);
      return;
    }
    if (jdTxt.trim().length < MIN_INPUT_LENGTH) {
      setError(
        `Job description must be at least ${MIN_INPUT_LENGTH} characters.`
      );
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Get current user
      if (!supabase) {
        throw new Error("Authentication service not available");
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const r = await fetch("/api/jobMatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resumeTxt,
          job: jdTxt,
          userId: user?.id,
        }),
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(data.error || "Unknown server error");
      }

      if (
        typeof data.matchScore !== "number" ||
        !Array.isArray(data.matchedSkills) ||
        !Array.isArray(data.missingSkills) ||
        !Array.isArray(data.gaps) ||
        !Array.isArray(data.actions)
      ) {
        throw new Error("API returned unexpected data");
      }

      setResult(data as MatchResult);
      setActiveTab("matched");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "var(--score-excellent)";
    if (score >= 50) return "var(--score-good)";
    return "var(--score-needs-work)";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "High Match";
    if (score >= 50) return "Medium Match";
    return "Low Match";
  };

  return (
    <div className=”min-h-screen bg-black text-white pt-16 pb-16”>
      <header className=”max-w-5xl mx-auto text-center mb-8 px-6”>
        <div className=”inline-flex items-center justify-center h-12 w-12 bg-[#fdc806]/10 border border-[#fdc806]/20 rounded-2xl mb-5”>
          <svg width=”22” height=”22” viewBox=”0 0 24 24” className=”stroke-[#fdc806] fill-none” strokeWidth=”1.5”>
            <circle cx=”11” cy=”11” r=”8” />
            <line x1=”21” y1=”21” x2=”16.65” y2=”16.65” />
          </svg>
        </div>
        <h1 className=”text-4xl md:text-5xl font-semibold tracking-tight text-white”>
          Job Match Analyzer
        </h1>
        <p className=”mt-3 text-base text-[#52525b] max-w-2xl mx-auto”>
          Compare your resume against any job description to see your match score and gaps.
        </p>
      </header>

      {showTips && (
        <div className="max-w-5xl mx-auto mb-8 px-6">
          <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-xl p-4 relative">
            <button
              className="absolute top-2 right-2 text-[#71717a] hover:text-[#a1a1aa]"
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
            <h3 className="text-lg font-medium text-[#fdc806] mb-2">
              Quick Job Match Tips
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-[#a1a1aa]">
              <li className="flex items-start gap-2">
                <span className="text-[#fdc806] flex-shrink-0">
                  ✓
                </span>
                <span>Highlight skills that match the job description</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#fdc806] flex-shrink-0">
                  ✓
                </span>
                <span>Use keywords from the job posting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#fdc806] flex-shrink-0">
                  ✓
                </span>
                <span>Quantify achievements relevant to the role</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#fdc806] flex-shrink-0">
                  ✓
                </span>
                <span>Tailor your resume to each job application</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      <section className="w-full max-w-5xl mx-auto px-6">
        <PlanChecker feature="job_match">
          <div className="bg-[#0a0a0a] rounded-xl border border-white/[0.07] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4">
              Upload Your Resume
            </h2>
            <ResumeUploader onResumeSubmit={setResumeTxt} simple={true} />
            <div className="mt-6">
              <label
                htmlFor="jd-input"
                className="block mb-2 font-semibold text-white"
              >
                Job Description
              </label>
              <textarea
                id="jd-input"
                name="jobDescription"
                value={jdTxt}
                onChange={(e) => setJdTxt(e.target.value)}
                rows={7}
                placeholder="Paste the job description here…"
                aria-required
                className="w-full bg-black/50 text-white placeholder-[#3f3f46] p-3 rounded-lg border border-white/[0.07] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div className="flex space-x-4 mt-6">
              <button
                type="submit"
                disabled={loading}
                onClick={submit}
                className="flex-1 px-6 py-3 bg-[var(--accent)] text-black font-semibold rounded-lg transition transform duration-200 hover:-translate-y-1 hover:shadow-xl disabled:opacity-50"
                aria-disabled={loading}
              >
                {loading ? "Analyzing…" : "Analyze Match"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="px-6 py-3 bg-white/[0.06] text-[#a1a1aa] font-semibold rounded-lg transition hover:bg-white/[0.09] disabled:opacity-50"
              >
                Clear
              </button>
            </div>
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
              className="p-8 bg-[#0a0a0a] rounded-xl border border-white/[0.07] shadow-xl flex flex-col items-center gap-4"
            >
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-t-[#fdc806] border-r-[#fdc806] border-b-transparent border-l-transparent rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-medium text-white">
                  Analyzing your match...
                </h3>
                <p className="text-[#71717a] mt-2">
                  Our AI is comparing your resume to the job description
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
        {result && (
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
            className="w-full max-w-5xl mx-auto mt-8 px-6"
          >
            <div className="bg-[#0a0a0a] rounded-xl border border-white/[0.07] shadow-xl overflow-hidden">
              <div className="bg-white/[0.03] p-6 border-b border-white/[0.07]">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div ref={scoreRef} className="w-36 h-36 flex-shrink-0">
                    <CircularProgressbar
                      value={result.matchScore}
                      text={`${result.matchScore}`}
                      styles={buildStyles({
                        textSize: "24px",
                        pathColor: getScoreColor(result.matchScore),
                        textColor: getScoreColor(result.matchScore),
                        trailColor: "var(--trail-color)",
                      })}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-2xl font-bold text-white">
                        Match Score
                      </h2>
                      <span
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: `${getScoreColor(
                            result.matchScore
                          )}30`,
                          color: getScoreColor(result.matchScore),
                        }}
                      >
                        {getScoreLabel(result.matchScore)}
                      </span>
                    </div>
                    <p className="text-[#a1a1aa] leading-relaxed">
                      {result.matchScore >= 80
                        ? "Great match! Your resume aligns well with the job description."
                        : result.matchScore >= 50
                        ? "Decent match, but there are areas to improve for a stronger fit."
                        : "Low match. Significant updates to your resume may be needed."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-b border-white/[0.07]">
                <div className="flex overflow-x-auto">
                  <button
                    className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                      activeTab === "matched"
                        ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                        : "text-[#71717a] hover:text-[#a1a1aa]"
                    }`}
                    onClick={() => setActiveTab("matched")}
                  >
                    Matched Skills ({result.matchedSkills.length})
                  </button>
                  <button
                    className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                      activeTab === "missing"
                        ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                        : "text-[#71717a] hover:text-[#a1a1aa]"
                    }`}
                    onClick={() => setActiveTab("missing")}
                  >
                    Missing Skills ({result.missingSkills.length})
                  </button>
                  <button
                    className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                      activeTab === "gaps"
                        ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                        : "text-[#71717a] hover:text-[#a1a1aa]"
                    }`}
                    onClick={() => setActiveTab("gaps")}
                  >
                    Gaps ({result.gaps.length})
                  </button>
                  <button
                    className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                      activeTab === "actions"
                        ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                        : "text-[#71717a] hover:text-[#a1a1aa]"
                    }`}
                    onClick={() => setActiveTab("actions")}
                  >
                    Actions ({result.actions.length})
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === "matched" && (
                  <RenderList
                    items={result.matchedSkills}
                    emptyText="No skills matched."
                    color="text-emerald-400"
                  />
                )}
                {activeTab === "missing" && (
                  <RenderList
                    items={result.missingSkills}
                    emptyText="No missing skills."
                    color="text-red-400"
                  />
                )}
                {activeTab === "gaps" && (
                  <RenderList
                    items={result.gaps}
                    emptyText="No major gaps."
                    color="text-[#fdc806]"
                  />
                )}
                {activeTab === "actions" && (
                  <RenderList
                    items={result.actions}
                    emptyText="No action items suggested."
                    color="text-[#fdc806]"
                  />
                )}
              </div>

              <div className="border-t border-white/[0.07] p-4 bg-black/20">
                <p className="text-[#71717a] text-sm text-center">
                  <span className="text-[#fdc806]">Pro Tip:</span> Tailor
                  your resume to include keywords and skills from the job
                  description to boost your match score!
                </p>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function RenderList({
  items,
  emptyText,
  color,
}: {
  items: string[];
  emptyText: string;
  color: string;
}) {
  return (
    <div className="p-6 bg-white/[0.02] border border-white/[0.07] rounded-xl">
      {items.length === 0 ? (
        <div className="text-center text-[#71717a]">
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
          <p>{emptyText}</p>
        </div>
      ) : (
        <ul className="list-disc list-inside space-y-2">
          {items.map((item, i) => (
            <li key={i} className={`text-white ${color}`}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
