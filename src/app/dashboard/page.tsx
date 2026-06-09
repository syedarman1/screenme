"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { authFetch } from "../lib/authFetch";
import { type User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Tool {
  title: string; description: string; href: string;
  available: boolean; isPro?: boolean; status?: "coming_soon" | "unavailable";
  icon: React.ReactNode;
}

const ICON_PROPS = { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.5 };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [usage, setUsage] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) { setError("Auth unavailable."); return; }
        const { data, error: e } = await supabase.auth.getUser();
        if (e || !data?.user) { setError("Please sign in to access your dashboard."); return; }
        setUser(data.user);

        const { data: pd, error: pe } = await supabase.from("user_plans").select("plan").eq("user_id", data.user.id).single();
        if (pe?.code === "PGRST116") await supabase.from("user_plans").insert({ user_id: data.user.id, plan: "free" });
        else if (pe) throw pe;
        setPlan(pd?.plan || "free");

        const { data: ud } = await supabase.from("user_usage").select("*").eq("user_id", data.user.id).single();
        setUsage(ud);

        const sub = supabase.channel("plan_watch")
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_plans", filter: `user_id=eq.${data.user.id}` },
            p => setPlan(p.new.plan))
          .subscribe();
        return () => { supabase?.removeChannel(sub); };
      } catch (err: any) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleUpgrade = async () => {
    if (!process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO) return;
    setBusy(true);
    try {
      const res = await authFetch("/api/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally { setBusy(false); }
  };

  const isPro = plan === "pro";

  const tools: Tool[] = [
    {
      title: "Job Tracker", description: "Track applications from saved to offer",
      href: "/applications", available: true,
      icon: <svg {...ICON_PROPS}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>,
    },
    {
      title: "My Resumes", description: "Save, version, and manage your resumes",
      href: "/resumes", available: true,
      icon: <svg {...ICON_PROPS}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>,
    },
    {
      title: "Resume Scanner", description: "AI-powered ATS scoring and keyword analysis",
      href: "/resume", available: true,
      icon: <svg {...ICON_PROPS}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
    },
    {
      title: "Job Match Analyzer", description: "Compare your resume to any job description",
      href: "/jobmatch", available: true,
      icon: <svg {...ICON_PROPS}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
    },
    {
      title: "Cover Letter Generator", description: "Tailored cover letters in under 30 seconds",
      href: "/coverLetter", available: true,
      icon: <svg {...ICON_PROPS}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
    },
    {
      title: "Interview Prep", description: "AI Q&A and live voice mock interviews",
      href: isPro ? "/interview" : "#", available: isPro, isPro: true,
      status: isPro ? undefined : "unavailable",
      icon: <svg {...ICON_PROPS}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>,
    },
    {
      title: "Resume Tailor", description: "Rewrite your resume to match any job description",
      href: "/tailor", available: true,
      icon: <svg {...ICON_PROPS}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
    },
    {
      title: "LinkedIn Optimizer", description: "Maximize your profile visibility",
      href: "#", available: false, status: "coming_soon",
      icon: <svg {...ICON_PROPS}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
    },
    {
      title: "Salary Negotiator", description: "Data-driven salary insights and scripts",
      href: "#", available: false, status: "coming_soon",
      icon: <svg {...ICON_PROPS}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    },
  ];

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <svg className="animate-spin h-6 w-6 text-fg-muted" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="card max-w-sm w-full text-center p-6">
        <h2 className="text-base font-semibold text-fg mb-2">Access required</h2>
        <p className="text-sm text-fg-muted mb-5">{error}</p>
        <Link href="/login" className="btn btn-primary">Sign in</Link>
      </div>
    </div>
  );

  const firstName = user?.user_metadata?.full_name?.split(" ")[0]
    || (user?.email ? user.email.split("@")[0].charAt(0).toUpperCase() + user.email.split("@")[0].slice(1) : "");

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-20">
        <header className="mb-10">
          <p className="section-label mb-2">Dashboard</p>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-fg">
              Hey, {firstName}
            </h1>
            {isPro && <span className="badge badge-accent">Pro</span>}
          </div>
        </header>

        <section className="mb-12">
          <p className="section-label mb-4">Your plan</p>
          <div className="card p-6">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-fg">{isPro ? "Pro" : "Free"}</h2>
                  {isPro && <span className="badge badge-accent">Active</span>}
                </div>
                <p className="text-sm text-fg-muted">
                  {isPro ? "Unlimited access to all features." : "3 scans · 2 cover letters · 2 job matches · 2 tailors per month."}
                </p>
              </div>
              {!isPro && (
                <button onClick={handleUpgrade} disabled={busy} className="btn btn-primary disabled:opacity-50">
                  {busy ? "Loading…" : "Upgrade — $15/mo"}
                </button>
              )}
            </div>

            {!isPro && usage && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-border">
                {[
                  { label: "Resume Scans", used: usage.resume_scans || 0, limit: 3 },
                  { label: "Cover Letters", used: usage.cover_letters || 0, limit: 2 },
                  { label: "Job Matches", used: usage.job_matches || 0, limit: 2 },
                  { label: "Resume Tailors", used: usage.resume_tailors || 0, limit: 2 },
                ].map(({ label, used, limit }) => {
                  const remaining = Math.max(0, limit - used);
                  const pct = Math.min(100, (used / limit) * 100);
                  const depleted = remaining === 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <p className="text-xs text-fg-muted">{label}</p>
                        <p className={`text-sm font-semibold tabular-nums ${depleted ? "text-red" : "text-fg"}`}>
                          {remaining}<span className="text-fg-subtle font-normal text-xs">/{limit}</span>
                        </p>
                      </div>
                      <div className="h-1 w-full rounded-full bg-surface-2 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${depleted ? "bg-red" : "bg-fg"}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section>
          <p className="section-label mb-4">Your tools</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => {
              const muted = !tool.available;
              return (
                <div key={tool.title} className={`card relative p-5 flex flex-col gap-3 h-full ${muted ? "opacity-50" : ""}`}>
                  {!tool.available && (
                    <span className={`badge absolute top-4 right-4 ${tool.isPro ? "badge-accent" : "badge-muted"}`}>
                      {tool.isPro ? "Pro" : "Soon"}
                    </span>
                  )}
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center border ${
                    muted ? "bg-surface-2 border-border text-fg-subtle" : "bg-surface-2 border-border text-fg"
                  }`}>
                    {tool.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-sm font-semibold mb-1 ${muted ? "text-fg-subtle" : "text-fg"}`}>{tool.title}</h3>
                    <p className={`text-xs leading-relaxed ${muted ? "text-fg-subtle" : "text-fg-muted"}`}>{tool.description}</p>
                  </div>
                  {tool.available ? (
                    <Link href={tool.href} className="btn btn-primary w-full py-2 text-xs">
                      Open
                    </Link>
                  ) : tool.isPro ? (
                    <button onClick={handleUpgrade} className="btn btn-secondary w-full py-2 text-xs">
                      Upgrade to unlock
                    </button>
                  ) : (
                    <div className="py-2 rounded-md bg-surface-2 text-fg-subtle text-xs text-center">Coming soon</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
