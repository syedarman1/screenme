"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { authFetch } from "../lib/authFetch";
import { useModalA11y } from "../hooks/useModalA11y";
import Link from "next/link";

/* ── Types ──────────────────────────────────────────────── */
interface ResumeVersion {
  id: string;
  name: string;
  score: number | null;
  content?: string;
  created_at: string;
  updated_at: string;
}

/* ── Helpers ────────────────────────────────────────────── */
function scoreColor(s: number | null): string {
  if (s === null) return "#A3A3A3";
  if (s >= 80) return "#3D7C52";
  if (s >= 60) return "#525252";
  if (s >= 40) return "#B45309";
  return "#C44B42";
}
function scoreLabel(s: number | null): string {
  if (s === null) return "Not scanned";
  if (s >= 80) return "Excellent";
  if (s >= 60) return "Good";
  if (s >= 40) return "Average";
  return "Needs work";
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Main Page ──────────────────────────────────────────── */
export default function ResumesPage() {
  const [resumes, setResumes]       = useState<ResumeVersion[]>([]);
  const [loading, setLoading]       = useState(true);
  const [userId, setUserId]         = useState<string | null>(null);
  const [showSave, setShowSave]     = useState(false);
  const [renameId, setRenameId]     = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [error, setError]           = useState<string | null>(null);
  const [userPlan, setUserPlan]     = useState<string>("free");

  const isPro = userPlan === "pro";
  const resumeLimit = isPro ? 20 : 3;
  const atLimit = resumes.length >= resumeLimit;

  /* ── Auth ── */
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
        supabase!.from("user_plans").select("plan").eq("user_id", data.user.id).single()
          .then(({ data: pd }) => setUserPlan(pd?.plan || "free"));
      }
    });
  }, []);

  /* ── Fetch ── */
  const fetchResumes = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await authFetch("/api/resumes");
      const data = await res.json();
      if (data.resumes) setResumes(data.resumes);
    } catch {
      setError("Failed to load resumes.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { if (userId) fetchResumes(); }, [userId, fetchResumes]);

  /* ── Delete ── */
  const deleteResume = async (id: string) => {
    setResumes(prev => prev.filter(r => r.id !== id));
    try {
      await authFetch("/api/resumes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      fetchResumes();
    }
  };

  /* ── Rename ── */
  const saveRename = async () => {
    if (!renameId || !renameName.trim()) return;
    setResumes(prev => prev.map(r => r.id === renameId ? { ...r, name: renameName.trim() } : r));
    setRenameId(null);
    try {
      await authFetch("/api/resumes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: renameId, name: renameName.trim() }),
      });
    } catch {
      fetchResumes();
    }
  };

  /* ── Loading / auth ── */
  if (!userId && !loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-sm text-fg-muted mb-4">Please sign in to manage your resumes.</p>
        <Link href="/login" className="px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-semibold">Sign in</Link>
      </div>
    </div>
  );

  return (
    <div className="page-shell">
      <div className="page-inner-md">

        {/* Header */}
        <header className="mb-10">
          <p className="section-label mb-2">Resume Manager</p>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">My Resumes</h1>
            {atLimit ? (
              <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2.5 bg-orange hover:bg-[#e8910a] text-white text-sm font-semibold rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                {isPro ? "Max reached" : "Limit reached — Upgrade"}
              </Link>
            ) : (
              <button
                onClick={() => setShowSave(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Save New Resume
              </button>
            )}
          </div>
        </header>

        {/* Stats */}
        {resumes.length > 0 && (
          <div className="flex gap-3 mb-8 overflow-x-auto pb-1">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border min-w-fit ${atLimit ? "border-[#ff9f0a]/30 bg-orange/[0.06]" : "border-border bg-surface"}`}>
              <span className="text-xs font-medium text-fg-muted">Saved</span>
              <span className={`text-sm font-semibold tabular-nums ${atLimit ? "text-orange" : "text-fg"}`}>{resumes.length}</span>
              <span className="text-xs text-fg-subtle">/ {resumeLimit}</span>
            </div>
            {(() => {
              const scored = resumes.filter(r => r.score !== null);
              if (scored.length === 0) return null;
              const avg = Math.round(scored.reduce((a, r) => a + (r.score ?? 0), 0) / scored.length);
              return (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-surface min-w-fit">
                  <span className="text-xs font-medium text-fg-muted">Avg Score</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: scoreColor(avg) }}>{avg}</span>
                </div>
              );
            })()}
          </div>
        )}

        {error && (
          <div className="alert-error mb-6" role="alert">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-7 w-7 text-fg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : resumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-lg bg-surface-2 border border-border/15 flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-fg mb-1">No saved resumes</h3>
            <p className="text-sm text-fg-muted mb-2 text-center max-w-xs">
              Save different versions of your resume to quickly send them to the scanner, job match, or cover letter tools.
            </p>
            <button
              onClick={() => setShowSave(true)}
              className="mt-4 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Save your first resume
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {resumes.map(resume => (
              <div key={resume.id} className="bg-surface rounded-lg border border-border p-5 hover:shadow-sm hover:border-border-2 transition-all group">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Score ring */}
                    <div className="relative w-12 h-12 shrink-0">
                      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" fill="none" stroke="#e8e8ed" strokeWidth="3" />
                        {resume.score !== null && (
                          <circle cx="24" cy="24" r="20" fill="none" stroke={scoreColor(resume.score)} strokeWidth="3"
                            strokeDasharray={`${(resume.score / 100) * 125.66} 125.66`}
                            strokeLinecap="round" />
                        )}
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums"
                        style={{ color: scoreColor(resume.score) }}>
                        {resume.score !== null ? resume.score : "—"}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {renameId === resume.id ? (
                        <div className="flex items-center gap-2">
                          <input value={renameName} onChange={e => setRenameName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRenameId(null); }}
                            autoFocus
                            className="px-3 py-1.5 rounded-lg border border-border/30 bg-bg text-sm text-fg focus:outline-none focus:ring-2 focus:ring-fg/15 w-48" />
                          <button onClick={saveRename} className="text-xs text-fg font-medium cursor-pointer">Save</button>
                          <button onClick={() => setRenameId(null)} className="text-xs text-fg-subtle cursor-pointer">Cancel</button>
                        </div>
                      ) : (
                        <h3 className="text-sm font-semibold text-fg truncate">{resume.name}</h3>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-medium" style={{ color: scoreColor(resume.score) }}>
                          {scoreLabel(resume.score)}
                        </span>
                        <span className="text-xs text-fg-subtle">{timeAgo(resume.updated_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setRenameId(resume.id); setRenameName(resume.name); }}
                      className="p-2 rounded-lg hover:bg-bg transition-colors cursor-pointer" title="Rename"
                    >
                      <svg className="w-4 h-4 text-fg-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                      </svg>
                    </button>
                    <Link
                      href="/resume"
                      className="p-2 rounded-lg hover:bg-bg transition-colors" title="Scan this resume"
                    >
                      <svg className="w-4 h-4 text-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => deleteResume(resume.id)}
                      className="p-2 rounded-lg hover:bg-red-bg transition-colors cursor-pointer" title="Delete"
                    >
                      <svg className="w-4 h-4 text-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Save Modal ── */}
      {showSave && userId && (
        <SaveResumeModal
          userId={userId}
          onClose={() => setShowSave(false)}
          onSaved={() => { setShowSave(false); fetchResumes(); }}
        />
      )}
    </div>
  );
}

/* ── Save Resume Modal ──────────────────────────────────── */
function SaveResumeModal({ userId, onClose, onSaved }: {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName]       = useState("");
  const [content, setContent] = useState("");
  const [mode, setMode]       = useState<"paste" | "upload">("paste");
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === "text/plain") {
      setContent(await file.text());
    } else {
      setErr("Only .txt files are supported for upload. For PDF/DOCX, paste the text content.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 50) { setErr("Resume must be at least 50 characters."); return; }
    setSaving(true);
    setErr("");

    try {
      const res = await authFetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Untitled Resume",
          content: content.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Failed to save."); return; }
      onSaved();
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const panelRef = useModalA11y<HTMLFormElement>(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <form ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="save-resume-title" onSubmit={handleSubmit} className="relative bg-surface rounded-lg border border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-7">
        <div className="flex items-center justify-between mb-6">
          <h2 id="save-resume-title" className="text-lg font-semibold text-fg">Save Resume</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-bg transition-colors cursor-pointer">
            <svg className="w-5 h-5 text-fg-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {err && <div className="mb-4 p-3 rounded-lg pill-danger text-sm">{err}</div>}

        <div className="flex flex-col gap-4">
          {/* Name */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Resume Name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Software Engineer v2"
              className="px-4 py-3 rounded-lg border border-border bg-bg text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-fg/15 focus:border-border/40 transition-all" />
          </label>

          {/* Mode toggle */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMode("paste")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${mode === "paste" ? "bg-accent text-white" : "bg-bg text-fg-muted"}`}>
              Paste Text
            </button>
            <button type="button" onClick={() => setMode("upload")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${mode === "upload" ? "bg-accent text-white" : "bg-bg text-fg-muted"}`}>
              Upload .txt
            </button>
          </div>

          {/* Content */}
          {mode === "paste" ? (
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={8}
              placeholder="Paste your resume text here..."
              className="px-4 py-3 rounded-lg border border-border bg-bg text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-fg/15 focus:border-border/40 transition-all resize-none font-mono leading-relaxed" />
          ) : (
            <div>
              <input type="file" accept=".txt" onChange={handleFile}
                className="block w-full text-sm text-fg-muted file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-surface-2 file:text-fg hover:file:bg-accent/[0.14] file:cursor-pointer" />
              {content && (
                <p className="mt-2 text-xs text-green">File loaded ({content.length.toLocaleString()} characters)</p>
              )}
            </div>
          )}

          {content.length > 0 && (
            <p className="text-xs text-fg-subtle">{content.length.toLocaleString()} characters</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-7 pt-5 border-t border-border">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-fg-muted hover:bg-bg transition-colors cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer">
            {saving ? "Saving..." : "Save Resume"}
          </button>
        </div>
      </form>
    </div>
  );
}
