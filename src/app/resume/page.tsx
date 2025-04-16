'use client';

import React, { useState } from 'react';
import ResumeUploader from '../components/ResumeUploader';

interface Audit {
  issues: string[];
  actions: string[];
}

export default function ResumeScreen() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (resume: string) => {
    setLoading(true);
    setError(null);
    setAudit(null);

    try {
      const res = await fetch('/api/analyzeResume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unknown error');
      }
      if (!('issues' in data) || !('actions' in data)) {
        throw new Error('Invalid response format');
      }
      setAudit(data as Audit);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-28 pb-16 px-6 md:px-8">
      {/* Header */}
      <header className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold">Resume Scanner</h1>
        <p className="mt-2 text-gray-400">
          Upload or paste your resume to receive actionable feedback.
        </p>
      </header>

      {/* Uploader */}
      <div className="max-w-4xl mx-auto bg-[#2a2a2a] rounded-xl shadow-lg p-8">
        <ResumeUploader onResumeSubmit={handleSubmit} />
      </div>

      {/* Status */}
      <div className="max-w-4xl mx-auto mt-8 space-y-4" role="status">
        {loading && <p className="text-center text-gray-400 italic">Analyzing… please wait.</p>}
        {error && <p className="text-center text-red-500 font-medium">Error: {error}</p>}
      </div>

      {/* Feedback Block */}
      {audit && (audit.issues.length > 0 || audit.actions.length > 0) && (
        <section className="max-w-4xl mx-auto mt-8 bg-[#2a2a2a] rounded-xl shadow-lg p-8" aria-label="Feedback Section">
          <h2 className="text-2xl font-semibold mb-4 text-[var(--accent)]">Feedback</h2>
          <ul className="space-y-4">
            {audit.issues.map((issue, i) => (
              <li
                key={i}
                className="flex flex-wrap items-start justify-between gap-4 text-gray-200 p-2 rounded hover:bg-gray-700 transition-colors"
                aria-describedby={`fix-${i}`}
              >
                <div className="flex items-start">
                  <span className="text-red-400 font-medium w-20 shrink-0">Issue {i + 1}:</span>
                  <span className="ml-2 text-gray-300">{issue}</span>
                </div>
                {audit.actions[i] && (
                  <div id={`fix-${i}`} className="flex items-start">
                    <span className="text-green-400 font-medium w-20 shrink-0">Fix {i + 1}:</span>
                    <span className="ml-2 text-gray-300">{parseFix(audit.actions[i])}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}