// components/ResumeUploader.tsx
"use client";

import React, { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf"; // the core
// import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.entry"; // the bundled worker

interface ResumeUploaderProps {
  onResumeSubmit: (resumeText: string) => void;
}

export default function ResumeUploader({
  onResumeSubmit,
}: ResumeUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    // Serve the worker from /public
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  }, []);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setText("");
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setFile(null);
  };

  const extractTextFromPDF = async (data: ArrayBuffer) => {
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const { items } = await page.getTextContent();
      fullText += items.map((it: any) => it.str).join(" ") + "\n\n";
    }
    return fullText;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (file) {
      if (file.type === "application/pdf") {
        const buffer = await file.arrayBuffer();
        const pdfText = await extractTextFromPDF(buffer);
        onResumeSubmit(pdfText);
      } else {
        onResumeSubmit(await file.text());
      }
    } else if (text.trim()) {
      onResumeSubmit(text);
    } else {
      alert("Please choose a file or paste your resume text.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* FILE PICKER */}
      <div>
        <label className="block mb-2 font-semibold text-gray-200">
          Upload Resume (PDF/Text)
        </label>
        <div className="flex items-center space-x-4">
          <label
            htmlFor="file-input"
            className="
              px-4 py-2 bg-[var(--accent)] text-black
              font-semibold rounded hover:opacity-90 active:scale-95
              transition duration-150 cursor-pointer
            "
          >
            {file?.name ?? "Choose File"}
          </label>
          <input
            id="file-input"
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          {file && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-sm text-gray-400 hover:text-gray-200 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* TEXT AREA FALLBACK */}
      <div>
        <label className="block mb-2 font-semibold text-gray-200">
          Or Paste Your Resume Text
        </label>
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Paste your resume text here…"
          className="
            w-full bg-[#1c1c1c] text-gray-200 placeholder-gray-500
            p-3 rounded-lg border border-gray-700 focus:outline-none
            focus:ring-2 focus:ring-[var(--accent)]
          "
          rows={6}
        />
      </div>

      {/* SUBMIT */}
      <button
        type="submit"
        className="
          w-full md:w-auto px-6 py-3 mt-2
          bg-[var(--accent)] text-black font-semibold rounded-lg
          hover:opacity-90 active:scale-95 transition duration-150
        "
      >
        Analyze Resume
      </button>
    </form>
  );
}
