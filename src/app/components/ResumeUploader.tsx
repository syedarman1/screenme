"use client";
import React, { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

export default function ResumeUploader(
  {
    onResumeSubmit,
    simple = false,          
  }: {
    onResumeSubmit: (txt: string) => void;
    simple?: boolean;
  }
) {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  }, []);

  /* ---------- helpers ---------- */
  const extractTextFromPDF = async (data: ArrayBuffer) => {
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let txt = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const { items } = await page.getTextContent();
      txt += items.map((it: any) => it.str).join(" ") + "\n\n";
    }
    return txt;
  };

  const handleFile = async (f: File) => {
    if (!f) return;
    setFile(f);
    const txt =
      f.type === "application/pdf"
        ? await extractTextFromPDF(await f.arrayBuffer())
        : await f.text();
    onResumeSubmit(txt);
  };

  /* ---------- UI ---------- */
  return (
    <div className="space-y-4">
      <label className="block font-semibold text-gray-200">
        Upload Resume (PDF / TXT)
      </label>

      <div className="flex items-center space-x-4">
        <label
          htmlFor="file-input"
          className="px-4 py-2 bg-[var(--accent)] text-black font-semibold rounded
                     hover:opacity-90 active:scale-95 transition duration-150 cursor-pointer"
        >
          {file?.name ?? "Choose File"}
        </label>
        <input
          id="file-input"
          type="file"
          accept=".pdf,.txt"
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          className="hidden"
        />

        {file && (
          <button
            type="button"
            onClick={() => {
              setFile(null);
              onResumeSubmit("");
            }}
            className="text-sm text-gray-400 hover:text-gray-200 transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Textarea falls back only when simple = false */}
      {!simple && (
        <>
          <label className="block mb-1 font-semibold text-gray-200">
            Or paste resume text
          </label>
          <textarea
            rows={6}
            disabled={Boolean(file)}
            onChange={(e) => onResumeSubmit(e.target.value)}
            placeholder="Paste your resume text here…"
            className="w-full bg-[#1c1c1c] text-gray-200 placeholder-gray-500
                       p-3 rounded-lg border border-gray-700 focus:outline-none
                       focus:ring-2 focus:ring-[var(--accent)]
                       disabled:opacity-40"
          />
        </>
      )}
    </div>
  );
}
