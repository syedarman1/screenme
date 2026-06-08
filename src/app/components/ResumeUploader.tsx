// src/app/components/ResumeUploader.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

interface ResumeUploaderProps {
  onResumeSubmit: (txt: string) => void;
  simple?: boolean;
}

export default function ResumeUploader({ onResumeSubmit, simple = false }: ResumeUploaderProps) {
  const [file, setFile]             = useState<File | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [charCount, setCharCount]   = useState(0);
  const [pasteText, setPasteText]   = useState("");
  const [dragging, setDragging]     = useState(false);
  const [mode, setMode]             = useState<"upload" | "paste">("upload");
  const inputRef                    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }, []);

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
      throw new Error("Could not extract text — this may be an image-based PDF. Try pasting your resume text instead.");
    }
  };

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
      setCharCount(txt.length);
      onResumeSubmit(txt);
    } catch (err: any) {
      setError(err.message);
      setFile(null);
      setCharCount(0);
      onResumeSubmit("");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setError(null);
    setCharCount(0);
    setPasteText("");
    onResumeSubmit("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.type === "application/pdf" || f.type === "text/plain")) {
      handleFile(f);
    } else {
      setError("Please drop a PDF or TXT file.");
    }
  };

  const handlePaste = (val: string) => {
    setPasteText(val);
    setCharCount(val.length);
    onResumeSubmit(val);
  };

  const wordCount = charCount > 0
    ? Math.round(charCount / 5)
    : 0;

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      {!simple && (
        <div className="flex gap-1 p-1 bg-bg rounded-lg w-fit">
          {(["upload", "paste"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                mode === m
                  ? "bg-surface text-fg shadow-sm"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {m === "upload" ? "Upload File" : "Paste Text"}
            </button>
          ))}
        </div>
      )}

      {/* Upload mode */}
      {(mode === "upload" || simple) && (
        <>
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                dragging
                  ? "border-border bg-surface-2"
                  : "border-border-2 bg-bg hover:border-border hover:bg-surface-2"
              }`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                dragging ? "bg-accent/10" : "bg-surface border border-border-2"
              }`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  className={dragging ? "stroke-fg" : "stroke-fg-muted"} strokeWidth="1.5">
                  <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold text-fg text-sm">
                  {dragging ? "Drop your resume here" : "Drop your resume or click to browse"}
                </p>
                <p className="text-fg-subtle text-xs mt-1">PDF or TXT · Max 10MB</p>
              </div>
              <input
                ref={inputRef}
                id="file-input"
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                disabled={loading}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between px-5 py-4 bg-surface-2 border border-border/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-t-fg border-r-fg/30 border-b-transparent border-l-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="stroke-fg" strokeWidth="2">
                      <path d="M4 2h10l6 6v14H4V2z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-fg text-sm font-medium">{file.name}</p>
                  {!loading && charCount > 0 && (
                    <p className="text-fg-subtle text-xs">~{wordCount.toLocaleString()} words extracted</p>
                  )}
                  {loading && <p className="text-fg text-xs">Extracting text…</p>}
                </div>
              </div>
              {!loading && (
                <button
                  onClick={handleClear}
                  className="text-fg-muted hover:text-fg transition-colors p-1"
                  aria-label="Remove file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Paste mode */}
      {mode === "paste" && !simple && (
        <div className="relative">
          <textarea
            rows={8}
            value={pasteText}
            onChange={(e) => handlePaste(e.target.value)}
            placeholder="Paste your full resume text here — include all sections: experience, education, skills, achievements…"
            className="w-full bg-surface text-fg placeholder:text-fg-subtle p-4 rounded-lg border border-border-2 focus:outline-none focus:border-border focus:ring-2 focus:ring-fg/10 text-sm leading-relaxed resize-none transition-all"
          />
          {pasteText.length > 0 && (
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs text-fg-subtle">~{Math.round(pasteText.length / 5).toLocaleString()} words</span>
              <button
                onClick={handleClear}
                className="text-xs text-fg-muted hover:text-fg transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert-error" role="alert">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Extraction warning */}
      {charCount === 0 && file && !loading && !error && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm" role="alert">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>Couldn&apos;t extract text — this may be an image-based PDF. Switch to &quot;Paste Text&quot; and paste your resume manually.</span>
        </div>
      )}
    </div>
  );
}
