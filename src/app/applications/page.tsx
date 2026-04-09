"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";

/* ── Types ──────────────────────────────────────────────── */
type Status = "saved" | "applied" | "interview" | "offer" | "rejected";

interface Application {
  id: string;
  company: string;
  role: string;
  status: Status;
  url: string | null;
  notes: string | null;
  job_description: string | null;
  applied_date: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS: { key: Status; label: string; color: string; bg: string; dot: string }[] = [
  { key: "saved",     label: "Saved",     color: "text-[#86868b]", bg: "bg-[#f5f5f7]",           dot: "bg-[#86868b]" },
  { key: "applied",   label: "Applied",   color: "text-[#0071e3]", bg: "bg-[#0071e3]/[0.06]",    dot: "bg-[#0071e3]" },
  { key: "interview", label: "Interview", color: "text-[#ff9f0a]", bg: "bg-[#ff9f0a]/[0.08]",    dot: "bg-[#ff9f0a]" },
  { key: "offer",     label: "Offer",     color: "text-[#34c759]", bg: "bg-[#34c759]/[0.08]",    dot: "bg-[#34c759]" },
  { key: "rejected",  label: "Rejected",  color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/[0.06]",    dot: "bg-[#ff3b30]" },
];

/* ── Main Page ──────────────────────────────────────────── */
export default function ApplicationsPage() {
  const [apps, setApps]         = useState<Application[]>([]);
  const [loading, setLoading]   = useState(true);
  const [userId, setUserId]     = useState<string | null>(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [editApp, setEditApp]   = useState<Application | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [userPlan, setUserPlan] = useState<string>("free");

  const isPro = userPlan === "pro";
  const appLimit = isPro ? Infinity : 10;
  const atLimit = apps.length >= appLimit;

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
  const fetchApps = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch("/api/applications", {
        headers: { "x-user-id": userId },
      });
      const data = await res.json();
      if (data.applications) setApps(data.applications);
    } catch {
      setError("Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { if (userId) fetchApps(); }, [userId, fetchApps]);

  /* ── Status move ── */
  const moveApp = async (id: string, newStatus: Status) => {
    // Optimistic update
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    try {
      await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": userId! },
        body: JSON.stringify({ id, status: newStatus }),
      });
    } catch {
      fetchApps(); // rollback
    }
  };

  /* ── Delete ── */
  const deleteApp = async (id: string) => {
    setApps(prev => prev.filter(a => a.id !== id));
    try {
      await fetch("/api/applications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-user-id": userId! },
        body: JSON.stringify({ id }),
      });
    } catch {
      fetchApps();
    }
  };

  /* ── Counts ── */
  const countByStatus = (s: Status) => apps.filter(a => a.status === s).length;

  /* ── Loading / auth ── */
  if (!userId && !loading) return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-sm text-[#6e6e73] mb-4">Please sign in to track your applications.</p>
        <Link href="/login" className="px-6 py-2.5 bg-[#0071e3] text-white rounded-xl text-sm font-semibold">Sign in</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      {/* Ambient bg */}
      <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#0071e3] opacity-[0.04] rounded-full blur-[140px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-24">

        {/* Header */}
        <header className="mb-10">
          <p className="text-xs font-medium text-[#aeaeb2] mb-2 uppercase tracking-widest">Job Tracker</p>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Applications</h1>
            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="flex items-center bg-white border border-black/[0.08] rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode("board")}
                  className={`px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${viewMode === "board" ? "bg-[#0071e3] text-white" : "text-[#6e6e73] hover:text-[#1d1d1f]"}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${viewMode === "list" ? "bg-[#0071e3] text-white" : "text-[#6e6e73] hover:text-[#1d1d1f]"}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.125 1.125 0 010 2.25H5.625a1.125 1.125 0 010-2.25z" /></svg>
                </button>
              </div>
              {atLimit && !isPro ? (
                <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2.5 bg-[#ff9f0a] hover:bg-[#e8910a] text-white text-sm font-semibold rounded-xl transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Limit reached — Upgrade
                </Link>
              ) : (
                <button
                  onClick={() => { setEditApp(null); setShowAdd(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Add Application
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Stats strip */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-1">
          {COLUMNS.map(col => (
            <div key={col.key} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/[0.06] bg-white min-w-fit`}>
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <span className="text-xs font-medium text-[#6e6e73]">{col.label}</span>
              <span className="text-sm font-semibold text-[#1d1d1f] tabular-nums">{countByStatus(col.key)}</span>
            </div>
          ))}
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border min-w-fit ${atLimit && !isPro ? "border-[#ff9f0a]/30 bg-[#ff9f0a]/[0.06]" : "border-black/[0.06] bg-white"}`}>
            <span className="text-xs font-medium text-[#6e6e73]">Total</span>
            <span className={`text-sm font-semibold tabular-nums ${atLimit && !isPro ? "text-[#ff9f0a]" : "text-[#1d1d1f]"}`}>
              {apps.length}{!isPro && <span className="text-[#aeaeb2] font-normal text-xs">/{appLimit}</span>}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-600 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-7 w-7 text-[#0071e3]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-3xl bg-[#0071e3]/[0.08] border border-[#0071e3]/15 flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-[#0071e3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[#1d1d1f] mb-1">No applications yet</h3>
            <p className="text-sm text-[#6e6e73] mb-6">Start tracking your job search by adding your first application.</p>
            <button
              onClick={() => { setEditApp(null); setShowAdd(true); }}
              className="px-5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Add your first application
            </button>
          </div>
        ) : viewMode === "board" ? (
          /* ── Kanban Board ── */
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
            {COLUMNS.map(col => {
              const colApps = apps.filter(a => a.status === col.key);
              return (
                <div key={col.key} className="min-w-[260px] flex-1">
                  {/* Column header */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${col.bg} mb-3`}>
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                    <span className={`text-xs font-medium ${col.color} opacity-60 ml-auto`}>{colApps.length}</span>
                  </div>
                  {/* Cards */}
                  <div className="flex flex-col gap-2">
                    {colApps.map(app => (
                      <AppCard
                        key={app.id}
                        app={app}
                        onMove={moveApp}
                        onEdit={() => { setEditApp(app); setShowAdd(true); }}
                        onDelete={() => deleteApp(app.id)}
                      />
                    ))}
                    {colApps.length === 0 && (
                      <div className="rounded-xl border border-dashed border-black/[0.08] p-6 text-center">
                        <p className="text-xs text-[#aeaeb2]">No {col.label.toLowerCase()} applications</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── List View ── */
          <div className="bg-white rounded-2xl border border-black/[0.08] overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_120px_100px_80px] gap-4 px-5 py-3 border-b border-black/[0.06] text-xs font-medium text-[#aeaeb2] uppercase tracking-wider">
              <span>Company</span>
              <span>Role</span>
              <span>Status</span>
              <span>Date</span>
              <span></span>
            </div>
            {apps.map(app => {
              const col = COLUMNS.find(c => c.key === app.status)!;
              return (
                <div key={app.id} className="grid grid-cols-[1fr_1fr_120px_100px_80px] gap-4 px-5 py-3.5 border-b border-black/[0.04] last:border-0 hover:bg-[#f5f5f7]/60 transition-colors items-center">
                  <span className="text-sm font-medium text-[#1d1d1f] truncate">{app.company}</span>
                  <span className="text-sm text-[#6e6e73] truncate">{app.role}</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${col.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                    {col.label}
                  </span>
                  <span className="text-xs text-[#aeaeb2] tabular-nums">
                    {app.applied_date ? new Date(app.applied_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditApp(app); setShowAdd(true); }} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors cursor-pointer" title="Edit">
                      <svg className="w-3.5 h-3.5 text-[#86868b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
                    </button>
                    <button onClick={() => deleteApp(app.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer" title="Delete">
                      <svg className="w-3.5 h-3.5 text-[#ff3b30]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {showAdd && (
        <AppModal
          app={editApp}
          userId={userId!}
          onClose={() => { setShowAdd(false); setEditApp(null); }}
          onSaved={() => { setShowAdd(false); setEditApp(null); fetchApps(); }}
        />
      )}
    </div>
  );
}

/* ── Card Component ─────────────────────────────────────── */
function AppCard({ app, onMove, onEdit, onDelete }: {
  app: Application;
  onMove: (id: string, s: Status) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-black/[0.08] p-4 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-[#1d1d1f] truncate">{app.company}</h4>
          <p className="text-xs text-[#6e6e73] truncate mt-0.5">{app.role}</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-1 rounded-lg hover:bg-[#f5f5f7] transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <svg className="w-4 h-4 text-[#86868b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-black/[0.08] rounded-xl shadow-lg py-1 z-50">
                <button onClick={() => { setMenuOpen(false); onEdit(); }} className="w-full text-left px-3 py-2 text-xs text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors cursor-pointer">Edit details</button>
                <div className="my-1 mx-2 border-t border-black/[0.06]" />
                <p className="px-3 py-1 text-[10px] text-[#aeaeb2] uppercase tracking-wider">Move to</p>
                {COLUMNS.filter(c => c.key !== app.status).map(c => (
                  <button key={c.key} onClick={() => { setMenuOpen(false); onMove(app.id, c.key); }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#f5f5f7] transition-colors flex items-center gap-2 cursor-pointer ${c.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    {c.label}
                  </button>
                ))}
                <div className="my-1 mx-2 border-t border-black/[0.06]" />
                <button onClick={() => { setMenuOpen(false); onDelete(); }} className="w-full text-left px-3 py-2 text-xs text-[#ff3b30] hover:bg-red-50 transition-colors cursor-pointer">Delete</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 mt-3">
        {app.applied_date && (
          <span className="text-[10px] text-[#aeaeb2]">
            {new Date(app.applied_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
        {app.url && (
          <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#0071e3] hover:underline truncate max-w-[120px]">
            Link
          </a>
        )}
        {app.notes && (
          <svg className="w-3 h-3 text-[#aeaeb2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        )}
      </div>
    </div>
  );
}

/* ── Add/Edit Modal ─────────────────────────────────────── */
function AppModal({ app, userId, onClose, onSaved }: {
  app: Application | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!app;
  const [company, setCompany]       = useState(app?.company ?? "");
  const [role, setRole]             = useState(app?.role ?? "");
  const [status, setStatus]         = useState<Status>(app?.status ?? "saved");
  const [url, setUrl]               = useState(app?.url ?? "");
  const [notes, setNotes]           = useState(app?.notes ?? "");
  const [jobDesc, setJobDesc]       = useState(app?.job_description ?? "");
  const [appliedDate, setAppliedDate] = useState(app?.applied_date ?? "");
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) { setErr("Company and role are required."); return; }
    setSaving(true);
    setErr("");

    try {
      const res = await fetch("/api/applications", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({
          ...(isEdit ? { id: app!.id } : {}),
          company: company.trim(),
          role: role.trim(),
          status,
          url: url.trim() || null,
          notes: notes.trim() || null,
          job_description: jobDesc.trim() || null,
          applied_date: appliedDate || null,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative bg-white rounded-3xl border border-black/[0.08] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-7">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#1d1d1f]">{isEdit ? "Edit Application" : "New Application"}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-[#f5f5f7] transition-colors cursor-pointer">
            <svg className="w-5 h-5 text-[#86868b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {err && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{err}</div>}

        <div className="flex flex-col gap-4">
          {/* Company */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[#6e6e73]">Company *</span>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google"
              className="px-4 py-3 rounded-xl border border-black/[0.08] bg-[#f5f5f7] text-sm text-[#1d1d1f] placeholder:text-[#aeaeb2] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]/40 transition-all" />
          </label>

          {/* Role */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[#6e6e73]">Role *</span>
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Frontend Engineer"
              className="px-4 py-3 rounded-xl border border-black/[0.08] bg-[#f5f5f7] text-sm text-[#1d1d1f] placeholder:text-[#aeaeb2] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]/40 transition-all" />
          </label>

          {/* Status + Date row */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[#6e6e73]">Status</span>
              <select value={status} onChange={e => setStatus(e.target.value as Status)}
                className="px-4 py-3 rounded-xl border border-black/[0.08] bg-[#f5f5f7] text-sm text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]/40 transition-all cursor-pointer">
                {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[#6e6e73]">Applied Date</span>
              <input type="date" value={appliedDate} onChange={e => setAppliedDate(e.target.value)}
                className="px-4 py-3 rounded-xl border border-black/[0.08] bg-[#f5f5f7] text-sm text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]/40 transition-all" />
            </label>
          </div>

          {/* URL */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[#6e6e73]">Job URL</span>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
              className="px-4 py-3 rounded-xl border border-black/[0.08] bg-[#f5f5f7] text-sm text-[#1d1d1f] placeholder:text-[#aeaeb2] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]/40 transition-all" />
          </label>

          {/* Notes */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[#6e6e73]">Notes</span>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Recruiter name, referral, follow-up dates..."
              className="px-4 py-3 rounded-xl border border-black/[0.08] bg-[#f5f5f7] text-sm text-[#1d1d1f] placeholder:text-[#aeaeb2] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]/40 transition-all resize-none" />
          </label>

          {/* Job Description (collapsible) */}
          <details className="group">
            <summary className="text-xs font-medium text-[#0071e3] cursor-pointer hover:underline">
              {jobDesc ? "Edit job description" : "Add job description (for cover letter / job match)"}
            </summary>
            <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} rows={4} placeholder="Paste the full job description here..."
              className="mt-2 w-full px-4 py-3 rounded-xl border border-black/[0.08] bg-[#f5f5f7] text-sm text-[#1d1d1f] placeholder:text-[#aeaeb2] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]/40 transition-all resize-none" />
          </details>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-7 pt-5 border-t border-black/[0.06]">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-black/[0.08] text-sm font-medium text-[#6e6e73] hover:bg-[#f5f5f7] transition-colors cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer">
            {saving ? "Saving..." : isEdit ? "Update" : "Add Application"}
          </button>
        </div>
      </form>
    </div>
  );
}
