"use client";

import React, { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

interface ResumeUploaderProps {
  onResumeSubmit: (txt: string) => void;
  simple?: boolean;
}

export default function ResumeUploader({ onResumeSubmit, simple = false }: ResumeUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  }, []);

  // Helper to extract text from PDF
  const extractTextFromPDF = async (data: ArrayBuffer): Promise<string> => {
    try {
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      let txt = "";
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();
        txt +=
          textContent.items
            .map((item: any) => item.str)
            .join(" ") + "\n\n";
      }
      return txt;
    } catch (e) {
      throw new Error("Failed to extract text from PDF: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  // Handle file upload
  const handleFile = async (f: File | null) => {
    if (!f) return;
    setFile(f);
    setLoading(true);
    setError(null);

    try {
      const txt =
        f.type === "application/pdf"
          ? await extractTextFromPDF(await f.arrayBuffer())
          : await f.text();
      onResumeSubmit(txt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred while processing the file");
      setFile(null);
      onResumeSubmit("");
    } finally {
      setLoading(false);
    }
  };

  // Reset file input
  const handleClear = () => {
    setFile(null);
    setError(null);
    onResumeSubmit("");
    const input = document.getElementById("file-input") as HTMLInputElement;
    if (input) input.value = "";
  };

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <div>
        <label htmlFor="file-input" className="block mb-1 font-semibold text-gray-200">
          Upload Resume (PDF or TXT)
        </label>
        <div className="flex items-center gap-4">
          <label
            htmlFor="file-input"
            className={`px-4 py-2 bg-[var(--accent)] text-black font-medium rounded-lg transition-colors hover:bg-opacity-90 focus:ring-2 focus:ring-[var(--accent)] cursor-pointer ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            aria-disabled={loading}
          >
            <span className="truncate max-w-[200px]">
              {loading ? "Processing…" : file?.name ?? "Choose File"}
            </span>
          </label>
          <input
            id="file-input"
            type="file"
            accept=".pdf,.txt"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            className="hidden"
            disabled={loading}
            aria-hidden="true"
          />
          {file && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 focus:ring-2 focus:ring-[var(--accent)] transition-colors flex items-center"
              aria-label="Clear selected file"
            >
              <svg
                className="h-4 w-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
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

      {/* Textarea (only when simple = false) */}
      {!simple && (
        <div>
          <label htmlFor="resume-text" className="block mb-1 font-semibold text-gray-200">
            Or paste resume text
          </label>
          <textarea
            id="resume-text"
            rows={6}
            disabled={Boolean(file) || loading}
            onChange={(e) => onResumeSubmit(e.target.value)}
            placeholder="Paste your resume text here…"
            className="w-full bg-[#1c1c1c] text-gray-200 placeholder-gray-400 p-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
            aria-disabled={Boolean(file) || loading}
            aria-label="Paste resume text"
          />
        </div>
      )}
    </div>
  );
}