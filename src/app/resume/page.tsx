"use client";

import React, { useState } from "react";
import ResumeUploader from "../components/ResumeUploader";

interface Audit {
  issues: string[];
  actions: string[];
}

export default function ResumeScreen() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (resume: string) => {
    setLoading(true);
    setError(null);
    setAudit(null);

    try {
      const res = await fetch("/api/analyzeResume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
        signal: AbortSignal.timeout(30000), // 30s timeout
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze resume");
      }
      if (!("issues" in data) || !("actions" in data)) {
        throw new Error("Invalid response format");
      }
      setAudit(data as Audit);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Helper to parse the fix text
  const parseFix = (action: string) => {
    const match = action.match(/Change this: '([^']+)' -----> to this: '([^']+)'/);
    if (match) {
      return `Change: "${match[1]}" → "${match[2]}"`;
    }
    return action;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-28 pb-16 px-6 md:px-8 flex flex-col items-center">
      {/* Header */}
      <header className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Resume Scanner</h1>
        <p className="mt-3 text-lg text-gray-400 max-w-xl">
          Upload or paste your resume to receive actionable feedback.
        </p>
      </header>

      {/* Uploader */}
      <section className="w-full max-w-4xl mx-auto bg-[#2a2a2a] rounded-xl shadow-lg p-8">
        <ResumeUploader onResumeSubmit={handleSubmit} />
      </section>

      {/* Status */}
      <section className="w-full max-w-4xl mx-auto mt-12 space-y-4" role="status">
        {loading && (
          <div className="flex items-center justify-center text-gray-400">
            <svg
              className="animate-spin h-6 w-6 mr-3 text-[var(--accent)]"
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
            Analyzing… please wait
          </div>
        )}
        {error && (
          <div
            className="p-4 bg-red-900 bg-opacity-50 text-red-300 rounded-lg flex items-center justify-center"
            role="alert"
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        )}
      </section>

      {/* Feedback Block */}
      {audit && (
        <section
          className="w-full max-w-4xl mx-auto mt-12 bg-[#2a2a2a] rounded-xl shadow-lg p-8"
          aria-label="Feedback Section"
        >
          <h2 className="text-2xl font-semibold text-gray-200 mb-6">Feedback</h2>
          {audit.issues.length === 0 && audit.actions.length === 0 ? (
            <p className="text-gray-300 text-center">
              No issues found! Your resume looks great.
            </p>
          ) : (
            <ul className="space-y-4" role="list">
              {audit.issues.map((issue, i) => (
                <li
                  key={i}
                  className="p-4 rounded-lg bg-[#1c1c1c] border border-gray-700 hover:shadow-md transition-shadow"
                  role="listitem"
                  aria-describedby={`fix-${i}`}
                >
                  <div className="flex items-start gap-2">
                    <svg
                      className="h-5 w-5 text-red-400 flex-shrink-0 mt-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <span className="text-red-400 font-medium w-16 flex-shrink-0">
                          Issue {i + 1}:
                        </span>
                        <p className="text-gray-300 leading-relaxed">{issue}</p>
                      </div>
                      {audit.actions[i] && (
                        <div className="-ml-7 flex items-start gap-2 mt-3" id={`fix-${i}`}>
                          <svg
                            className="h-5 w-5 text-[var(--accent)] flex-shrink-0 mt-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-[var(--accent)] font-medium w-12 flex-shrink-0">
                            Fix {i + 1}:
                          </span>
                          <p className="text-gray-300 leading-relaxed">{parseFix(audit.actions[i])}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}