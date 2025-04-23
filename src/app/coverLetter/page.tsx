"use client";

import React, { useState } from "react";
import ResumeUploader from "../components/ResumeUploader";

export default function CoverLetterPage() {
  const [resumeText, setResumeText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  const handleGenerate = async () => {
    if (!resumeText || !jobTitle || !company) {
      setError("Resume, job title, and company are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coverLetter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: resumeText, jobTitle, company, jobDesc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setCoverLetter(data.coverLetter);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => { setIsEditing(true); setEditText(coverLetter); };
  const saveEdit  = () => { setCoverLetter(editText); setIsEditing(false); };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-28 pb-16 px-6 md:px-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold">Cover Letter Generator</h1>
        <p className="mt-2 text-gray-400">
          Upload your resume, enter role details, and generate a tailored cover letter.
        </p>
      </div>

      <div className="max-w-4xl mx-auto bg-[#2a2a2a] rounded-xl p-8 space-y-6">
        <ResumeUploader onResumeSubmit={setResumeText} />

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-semibold">Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className="w-full bg-[#1c1c1c] text-gray-200 p-3 rounded border border-gray-700 focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Company</label>
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full bg-[#1c1c1c] text-gray-200 p-3 rounded border border-gray-700 focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
        </div>

        <div>
          <label className="block mb-1 font-semibold">Job Description (optional)</label>
          <textarea
            rows={4}
            value={jobDesc}
            onChange={e => setJobDesc(e.target.value)}
            placeholder="Paste the job description here..."
            className="w-full bg-[#1c1c1c] text-gray-200 p-3 rounded border border-gray-700 focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !resumeText || !jobTitle || !company}
          className="w-full bg-[var(--accent)] text-black font-semibold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition"
        >
          {loading ? "Generating…" : "Generate Cover Letter"}
        </button>

        {error && <p className="text-red-500 text-center">{error}</p>}
      </div>

      {coverLetter && (
        <div className="max-w-4xl mx-auto mt-10 bg-[#2a2a2a] rounded-xl p-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Your Cover Letter</h2>
            {!isEditing ? (
              <button
                onClick={startEdit}
                className="px-3 py-1 bg-[var(--accent)] text-black rounded-md"
              >
                Edit
              </button>
            ) : (
              <button
                onClick={saveEdit}
                className="px-3 py-1 bg-green-600 text-white rounded-md"
              >
                Save
              </button>
            )}
          </div>

          {isEditing ? (
            <textarea
              rows={10}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full bg-[#1c1c1c] text-gray-200 p-3 rounded border border-gray-700 focus:ring-2 focus:ring-[var(--accent)]"
            />
          ) : (
            <pre className="whitespace-pre-wrap text-gray-200">{coverLetter}</pre>
          )}
        </div>
      )}
    </div>
  );
}
