"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { authFetch } from "../lib/authFetch";
import type { DashboardData } from "../lib/plans";
import DashboardView from "./DashboardView";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const refresh = useRef<() => void>(() => {});

  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    let queued = false;
    let authEpoch = 0;
    let channel: RealtimeChannel | null = null;
    let channelUser: string | null = null;
    const abort = new AbortController();
    const load = async () => {
      if (stopped) return;
      if (inFlight) { queued = true; return; }
      inFlight = true;
      const epoch = authEpoch;
      try {
        if (!supabase) throw new Error("Account service unavailable. Please retry.");
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (stopped || epoch !== authEpoch) return;
        if (authError || !auth.user) { setSignedOut(true); setData(null); return; }
        setSignedOut(false);
        if (channelUser !== auth.user.id) {
          if (channel) void supabase.removeChannel(channel);
          channelUser = auth.user.id;
          try {
            channel = supabase.channel(`dashboard-plan:${auth.user.id}`)
              .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_plans", filter: `user_id=eq.${auth.user.id}` }, () => { void load(); }).subscribe();
          } catch { /* Focus refresh still works if realtime is unavailable. */ }
        }
        try {
          if (sessionStorage.getItem("screenme-after-auth") === "/checkout") {
            sessionStorage.removeItem("screenme-after-auth");
            router.replace("/checkout");
            return;
          }
        } catch { /* Upgrade remains available in the dashboard. */ }
        const name = auth.user.user_metadata?.full_name;
        setFirstName(typeof name === "string" ? name.trim().split(/\s+/)[0].slice(0, 40) : "");
        const response = await authFetch("/api/dashboard", { signal: abort.signal });
        if (response.status === 401) { if (!stopped) { setSignedOut(true); setData(null); } return; }
        if (!response.ok) throw new Error("We couldn’t refresh your dashboard. Please retry.");
        const snapshot: DashboardData = await response.json();
        if (!stopped && epoch === authEpoch) { setData(snapshot); setError(null); }
      } catch (caught) {
        if (!stopped && epoch === authEpoch) setError(caught instanceof Error ? caught.message : "Dashboard unavailable. Please retry.");
      } finally {
        inFlight = false;
        if (queued && !stopped) { queued = false; void load(); }
      }
    };
    refresh.current = () => { void load(); };
    const onFocus = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const subscription = supabase?.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT") { authEpoch++; setData(null); setSignedOut(true); }
      else if (event === "SIGNED_IN") window.setTimeout(() => { void load(); }, 0);
    }).data.subscription;
    void load();
    return () => { stopped = true; abort.abort(); subscription?.unsubscribe(); if (channel && supabase) void supabase.removeChannel(channel); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [router]);

  const handleBilling = useCallback(async () => {
    setBusy(true); setBillingError(null);
    try {
      const response = await authFetch("/api/stripe/portal", { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Billing is unavailable.");
      window.location.assign(result.url);
    } catch (caught) { setBillingError(caught instanceof Error ? caught.message : "Billing is unavailable."); }
    finally { setBusy(false); }
  }, []);

  if (signedOut || (!data && error)) return <main className="flex min-h-screen items-center justify-center bg-bg px-6 pt-20"><section className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center"><h1 className="text-xl font-semibold tracking-tight">{signedOut ? "Your workspace is waiting." : "Let’s try that again."}</h1><p className="mt-3 text-sm leading-7 text-fg-muted">{signedOut ? "Sign in to see your tools, saved work, and remaining usage." : error}</p>{signedOut ? <Link href="/login" className="btn btn-primary mt-6">Sign in</Link> : <button onClick={() => { setError(null); refresh.current(); }} className="btn btn-primary mt-6">Retry</button>}</section></main>;
  if (!data) return <main className="min-h-screen bg-bg px-6 pb-12 pt-24"><div role="status" className="mx-auto max-w-6xl"><p className="text-sm text-fg-muted">Loading your workspace…</p><div className="mt-8 h-64 rounded-2xl border border-border bg-surface" /><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="h-44 rounded-2xl border border-border bg-surface" /><div className="h-44 rounded-2xl border border-border bg-surface" /></div></div></main>;
  return <DashboardView firstName={firstName} data={data} billingBusy={busy} billingError={billingError} onBilling={handleBilling} refreshError={error} onRefresh={() => refresh.current()} />;
}
