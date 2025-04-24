"use client";

import React, { useState } from "react";
import ResumeUploader from "../components/ResumeUploader";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

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

  const handleGenerate = async () => {
    if (!resumeText || !jobTitle || !company) {
      setError("Please fill in resume, job title, and company.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coverLetter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resumeText,
          jobTitle,
          company,
          jobDesc,
          tone,
        }),
        signal: AbortSignal.timeout(30000), // 30s timeout
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to generate cover letter");
      if (!data.coverLetter) throw new Error("No cover letter returned");
      setCoverLetter(data.coverLetter);
      setIsEditing(false);
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    setEditText(coverLetter);
    setIsEditing(true);
    // Focus textarea after render
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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-28 pb-16 px-6 md:px-12 flex flex-col items-center">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">
          Cover Letter Generator
        </h1>
        <p className="mt-3 text-lg text-gray-400 max-w-xl">
          Create a tailored cover letter by uploading your resume, entering role
          details, and choosing a tone.
        </p>
      </header>

      <section className="w-full max-w-4xl bg-[#2a2a2a] rounded-xl p-8 space-y-6 shadow-lg">
        <ResumeUploader onResumeSubmit={setResumeText} />

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="jobTitle"
              className="block mb-1 font-semibold text-gray-200"
            >
              Job Title
            </label>
            <input
              id="jobTitle"
              className="w-full bg-[#1c1c1c] p-3 rounded border border-gray-700 text-gray-200 focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
              placeholder="e.g., Senior Backend Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              aria-required="true"
            />
          </div>
          <div>
            <label
              htmlFor="company"
              className="block mb-1 font-semibold text-gray-200"
            >
              Company
            </label>
            <input
              id="company"
              className="w-full bg-[#1c1c1c] p-3 rounded border border-gray-700 text-gray-200 focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
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
            className="block mb-1 font-semibold text-gray-200"
          >
            Job Description (Optional)
          </label>
          <textarea
            id="jobDesc"
            className="w-full bg-[#1c1c1c] p-3 rounded border border-gray-700 text-gray-200 focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
            rows={4}
            placeholder="Paste the job description here…"
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                tone === t
                  ? "bg-[var(--accent)] text-black ring-2 ring-[var(--accent)]"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600 focus:ring-2 focus:ring-[var(--accent)]"
              }`}
              aria-pressed={tone === t}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !resumeText || !jobTitle || !company}
          className="w-full bg-[var(--accent)] py-3 rounded-lg text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-opacity-90 transition-colors flex items-center justify-center"
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

        {error && (
          <div
            className="p-4 bg-red-900 bg-opacity-50 text-red-300 rounded-lg flex items-center"
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

      {coverLetter && (
        <section className="w-full max-w-4xl mt-12 bg-[#2a2a2a] rounded-xl p-8 space-y-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-200">
              Your Cover Letter
            </h2>
            {!isEditing ? (
              <button
                onClick={startEdit}
                className="px-4 py-2 bg-[var(--accent)] text-black rounded-lg font-medium hover:bg-opacity-90 transition-colors focus:ring-2 focus:ring-[var(--accent)]"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  className="px-4 py-2 bg-[var(--accent)] text-black rounded-lg font-medium hover:bg-opacity-90 transition-colors focus:ring-2 focus:ring-[var(--accent)]"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors focus:ring-2 focus:ring-[var(--accent)]"
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
              className="w-full bg-[#1c1c1c] text-gray-200 p-4 rounded border border-gray-700 focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
              aria-label="Edit cover letter"
            />
          ) : (
            <pre className="whitespace-pre-wrap text-gray-200">
              {coverLetter}
            </pre>
          )}

          {!isEditing && (
            <div className="flex gap-4 mt-6">
              <button
                onClick={downloadDOCX}
                className="px-4 py-2 bg-[var(--accent)] text-black rounded-lg font-medium hover:bg-opacity-90 transition-colors focus:ring-2 focus:ring-[var(--accent)] flex items-center"
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
        </section>
      )}
    </div>
  );
}
