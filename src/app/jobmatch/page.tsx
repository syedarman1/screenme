"use client";
import React, { useState, useMemo, useCallback } from "react";
import ResumeUploader from "../components/ResumeUploader";

type MatchResult = {
  matchScore:    number;
  matchedSkills: string[];
  missingSkills: string[];
  gaps:          string[];
  actions:       string[];
};

const MIN_INPUT_LENGTH = 50;
const STOP_WORDS = new Set([
  "with", "that", "the", "and", "for", "you", "will", "from", /* etc… */
]);

export default function JobMatchPage() {
  const [resumeTxt, setResumeTxt] = useState("");
  const [jdTxt,     setJdTxt]     = useState("");
  const [result,    setResult]    = useState<MatchResult | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // memoize resumeWords (for future highlighting features)
  const resumeWords = useMemo(() => {
    return Array.from(
      new Set(
        resumeTxt
          .toLowerCase()
          .split(/\W+/)
          .filter(w => w.length > 3 && !STOP_WORDS.has(w))
      )
    );
  }, [resumeTxt]);

  const resetForm = useCallback(() => {
    setResumeTxt("");
    setJdTxt("");
    setResult(null);
    setError(null);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Input validation
    if (resumeTxt.trim().length < MIN_INPUT_LENGTH) {
      setError(`Resume must be at least ${MIN_INPUT_LENGTH} characters.`);
      return;
    }
    if (jdTxt.trim().length < MIN_INPUT_LENGTH) {
      setError(`Job description must be at least ${MIN_INPUT_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const r = await fetch("/api/jobMatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: resumeTxt, job: jdTxt }),
      });

      let data: any;
      try {
        data = await r.json();
      } catch {
        throw new Error("Server returned invalid response");
      }

      if (!r.ok) {
        throw new Error(data.error || "Unknown server error");
      }

      // safe guard
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Score tier
  const tier = result
    ? result.matchScore >= 80
      ? "High"
      : result.matchScore >= 50
      ? "Medium"
      : "Low"
    : null;

  const barColor = tier === "High"
    ? "bg-green-500"
    : tier === "Medium"
    ? "bg-yellow-400"
    : "bg-red-500";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-28 pb-16 px-6">
      <header className="text-center mb-12 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold">Job-Match Scanner</h1>
        <p className="mt-2 text-gray-400">
          Upload your resume <span aria-hidden="true">•</span> or paste it, then paste the job description to see your match.
        </p>
      </header>

      <form
        onSubmit={submit}
        className="max-w-3xl mx-auto bg-[#2a2a2a] rounded-xl p-8 space-y-6"
        aria-labelledby="jobmatch-form"
      >
        <h2 id="jobmatch-form" className="sr-only">Job Match Form</h2>

        {/* Résumé uploader */}
        <ResumeUploader
          onResumeSubmit={setResumeTxt}
          simple={true}
        />

        {/* Job description */}
        <div>
          <label htmlFor="jd-input" className="block mb-2 font-semibold">
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
            className="w-full bg-[#1c1c1c] text-gray-200 placeholder-gray-500
                       p-3 rounded-lg border border-gray-700 focus:outline-none
                       focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        {/* Actions */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-[var(--accent)] text-black font-semibold rounded-lg
                       transition transform duration-200 hover:-translate-y-1 hover:shadow-xl
                       disabled:opacity-50"
            aria-disabled={loading}
          >
            {loading ? "Analyzing…" : "Analyze Match"}
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={loading}
            className="px-6 py-3 bg-gray-600 text-gray-300 font-semibold rounded-lg
                       transition hover:bg-gray-500 disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        {error && (
          <p role="alert" className="text-center text-red-500">
            {error}
          </p>
        )}
      </form>

      {/* Results */}
      {result && tier && (
        <section
          aria-labelledby="results-heading"
          className="max-w-3xl mx-auto mt-10 bg-[#2a2a2a] rounded-xl p-8 space-y-8"
        >
          <h2 id="results-heading" className="sr-only">Job Match Results</h2>

          {/* Score bar */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-medium text-gray-200">{tier} Match</span>
              <span className="font-medium text-gray-200">{result.matchScore}%</span>
            </div>
            <div className="w-full bg-gray-700 h-3 rounded overflow-hidden" role="progressbar"
                 aria-valuenow={result.matchScore} aria-valuemin={0} aria-valuemax={100}>
              <div className={`${barColor} h-3`} style={{ width: `${result.matchScore}%` }} />
            </div>
          </div>

          {/* Matched skills */}
          <RenderList
            title="Skills Matched"
            colour="text-green-400"
            items={result.matchedSkills}
            emptyText="No skills matched."
          />

          {/* Missing skills */}
          <RenderList
            title="Missing Skills"
            colour="text-red-400"
            items={result.missingSkills}
            emptyText="No missing skills."
          />

          {/* Gaps */}
          <RenderList
            title="Gaps Detected"
            colour="text-yellow-400"
            items={result.gaps}
            emptyText="No major gaps."
          />

          {/* Action items */}
          <RenderList
            title="Action Items"
            colour="text-[var(--accent)]"
            items={result.actions}
            emptyText=""
          />
        </section>
      )}
    </div>
  );
}

/* Helper for rendering lists with fallbacks */
function RenderList({
  title,
  colour,
  items,
  emptyText,
}: {
  title: string;
  colour: string;
  items: string[];
  emptyText?: string;
}) {
  if (!items.length && !emptyText) return null;
  return (
    <div>
      <h3 className={`text-lg font-medium ${colour} mb-2`}>{title}</h3>
      <ul className="list-disc list-inside space-y-1 text-gray-300">
        {items.length
          ? items.map((t, i) => <li key={i}>{t}</li>)
          : <li className="italic">{emptyText}</li>}
      </ul>
    </div>
  );
}
