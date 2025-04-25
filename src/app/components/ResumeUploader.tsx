// src/app/components/ResumeUploader.tsx
"use client";

import React, { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

interface ResumeUploaderProps {
  onResumeSubmit: (txt: string) => void;
  simple?: boolean;
}

export default function ResumeUploader({
  onResumeSubmit,
  simple = false,
}: ResumeUploaderProps) {
  const [file, setFile]           = useState<File | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);

  // Always load the worker from the official CDN
  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }, []);

  // Extract plain text from each page of a PDF
  const extractTextFromPDF = async (data: ArrayBuffer): Promise<string> => {
    try {
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      let txt = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page    = await pdf.getPage(i);
        const content = await page.getTextContent();
        txt += content.items.map((x: any) => x.str).join(" ") + "\n\n";
      }
      return txt;
    } catch (e) {
      console.error("PDF.js error:", e);
      throw new Error("Could not extract text—maybe it’s image-only or the worker failed to load.");
    }
  };

  // Handle file selection
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

      console.log("Extracted resume characters →", txt.length);
      setCharCount(txt.length);
      onResumeSubmit(txt);
    } catch (err: any) {
      setError(err.message);
      // reset so user can retry or paste
      setFile(null);
      setCharCount(0);
      onResumeSubmit("");
    } finally {
      setLoading(false);
    }
  };

  // Clear the current file
  const handleClear = () => {
    setFile(null);
    setError(null);
    setCharCount(0);
    onResumeSubmit("");
    const inp = document.getElementById("file-input") as HTMLInputElement;
    if (inp) inp.value = "";
  };

  return (
    <div className="space-y-4">
      {/* File picker */}
      <div>
        <label className="block mb-1 text-gray-200 font-semibold">
          Upload Resume (PDF or TXT)
        </label>
        <div className="flex items-center gap-3">
          <label
            htmlFor="file-input"
            className={`px-4 py-2 bg-[var(--accent)] text-black rounded-lg cursor-pointer ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Processing…" : file?.name ?? "Choose File"}
          </label>
          <input
            id="file-input"
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            disabled={loading}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {file && !loading && (
            <button
              onClick={handleClear}
              className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* user guidance */}
      {charCount === 0 && file && !loading && (
        <div className="p-3 bg-red-900 bg-opacity-60 text-red-300 rounded" role="alert">
          Could not extract text—maybe it’s an image-only PDF or the worker failed. You can paste below instead.
        </div>
      )}

      {/* Paste fallback */}
      {!simple && (
        <div>
          <label className="block mb-1 text-gray-200 font-semibold">
            Or paste resume text
          </label>
          <textarea
            rows={6}
            disabled={!!file || loading}
            onChange={(e) => {
              const t = e.target.value;
              setCharCount(t.length);
              onResumeSubmit(t);
            }}
            placeholder="Paste your resume text here…"
            className="w-full bg-[#1c1c1c] text-gray-200 p-3 rounded-lg border border-gray-700"
          />
        </div>
      )}
    </div>
  );
}
