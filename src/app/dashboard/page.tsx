"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
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
  const [user,     setUser]    = useState<User | null>(null);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState<string | null>(null);
  const [plan,     setPlan]    = useState<string | null>(null);
  const [usage,    setUsage]   = useState<any>(null);
  const [busy,     setBusy]    = useState(false);

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
      const res = await fetch("/api/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO, userId: user?.id }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally { setBusy(false); }
  };

  const isPro = plan === "pro";

  const tools: Tool[] = [
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

  /* ── Loading / error ── */
  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <svg className="animate-spin h-7 w-7 text-[#fdc806]" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/15 flex items-center justify-center mx-auto mb-4">
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h2 className="text-base font-semibold text-white mb-2">Access required</h2>
        <p className="text-sm text-[#52525b] mb-6">{error}</p>
        <Link href="/login" className="inline-block px-6 py-2.5 bg-[#fdc806] hover:bg-[#fdd835] text-black font-semibold rounded-xl text-sm transition-colors">Sign in</Link>
      </div>
    </div>
  );

  const firstName = user?.user_metadata?.full_name?.split(" ")[0]
    || (user?.email ? user.email.split("@")[0].charAt(0).toUpperCase() + user.email.split("@")[0].slice(1) : "");

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ambient */}
      <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#fdc806] opacity-[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-24 pb-24">

        {/* Header */}
        <header className="mb-14">
          <p className="text-xs font-medium text-[#52525b] mb-2 uppercase tracking-widest">Dashboard</p>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
              Hey, {firstName}
            </h1>
            {isPro && (
              <span className="px-3.5 py-1.5 rounded-full border border-[#fdc806]/25 bg-[#fdc806]/10 text-[#fdc806] text-xs font-semibold uppercase tracking-wider">
                Pro
              </span>
            )}
          </div>
        </header>

        {/* Tools */}
        <section className="mb-16">
          <p className="text-xs font-medium text-[#3f3f46] uppercase tracking-widest mb-5">Your tools</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tools.map(tool => {
              const muted = !tool.available;
              return (
                <div key={tool.title} className="relative">
                  <div className={`rounded-2xl border p-5 flex flex-col gap-4 h-full transition-all duration-300
                    ${muted
                      ? "bg-[#050505] border-white/[0.04] opacity-50"
                      : "bg-[#0a0a0a] border-white/[0.07] hover:border-white/[0.12] hover:bg-[#0d0d0d]"
                    }`}>
                    {!tool.available && (
                      <span className={`absolute top-3.5 right-3.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border
                        ${tool.isPro
                          ? "bg-[#fdc806]/10 text-[#fdc806] border-[#fdc806]/20"
                          : "bg-white/[0.04] text-[#3f3f46] border-white/[0.06]"
                        }`}>
                        {tool.isPro ? "Pro" : "Soon"}
                      </span>
                    )}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border
                      ${muted
                        ? "bg-white/[0.02] border-white/[0.04] text-[#27272a]"
                        : "bg-[#fdc806]/10 border-[#fdc806]/15 text-[#fdc806]"
                      }`}>
                      {tool.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-sm font-semibold mb-1 ${muted ? "text-[#27272a]" : "text-white"}`}>{tool.title}</h3>
                      <p className={`text-xs leading-relaxed ${muted ? "text-[#1c1c1e]" : "text-[#52525b]"}`}>{tool.description}</p>
                    </div>
                    {tool.available ? (
                      <Link href={tool.href}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#fdc806] hover:bg-[#fdd835] text-black text-xs font-semibold transition-colors group">
                        Open
                        <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
                      </Link>
                    ) : tool.isPro ? (
                      <button onClick={handleUpgrade}
                        className="py-2.5 rounded-xl border border-[#fdc806]/20 bg-[#fdc806]/6 text-[#fdc806] text-xs font-medium hover:bg-[#fdc806]/10 transition-colors cursor-pointer">
                        Upgrade to unlock
                      </button>
                    ) : (
                      <div className="py-2.5 rounded-xl bg-white/[0.03] text-[#3f3f46] text-xs text-center">Coming soon</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Plan */}
        <section>
          <p className="text-xs font-medium text-[#3f3f46] uppercase tracking-widest mb-5">Your plan</p>
          <div className={`rounded-2xl border p-7 ${isPro ? "border-[#fdc806]/20 bg-[#0d0b00]" : "border-white/[0.07] bg-[#0a0a0a]"}`}>
            <div className="flex items-start justify-between flex-wrap gap-6 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <h2 className="text-xl font-semibold text-white">{isPro ? "Pro" : "Free"}</h2>
                  {isPro && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#fdc806]/15 text-[#fdc806] border border-[#fdc806]/20">Active</span>
                  )}
                </div>
                <p className="text-sm text-[#52525b]">
                  {isPro ? "Unlimited access to all features." : "3 scans · 2 cover letters · 2 job matches per month."}
                </p>
              </div>
              {!isPro && (
                <button onClick={handleUpgrade} disabled={busy}
                  className="px-5 py-2.5 rounded-xl bg-[#fdc806] hover:bg-[#fdd835] text-black font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer">
                  {busy ? "Loading…" : "Upgrade — $15/mo"}
                </button>
              )}
            </div>

            {/* Usage bars */}
            {!isPro && usage && (
              <div className="grid grid-cols-3 gap-4 pt-5 border-t border-white/[0.06]">
                {[
                  { label: "Resume Scans",   used: usage.resume_scans  || 0, limit: 3 },
                  { label: "Cover Letters",  used: usage.cover_letters || 0, limit: 2 },
                  { label: "Job Matches",    used: usage.job_matches   || 0, limit: 2 },
                ].map(({ label, used, limit }) => {
                  const remaining = Math.max(0, limit - used);
                  const pct = Math.min(100, (used / limit) * 100);
                  const depleted = remaining === 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between items-baseline mb-2">
                        <p className="text-xs text-[#52525b]">{label}</p>
                        <p className={`text-sm font-semibold tabular-nums ${depleted ? "text-red-400" : "text-white"}`}>
                          {remaining}<span className="text-[#3f3f46] font-normal text-xs">/{limit}</span>
                        </p>
                      </div>
                      <div className="h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${depleted ? "bg-red-400" : "bg-[#fdc806]"}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
