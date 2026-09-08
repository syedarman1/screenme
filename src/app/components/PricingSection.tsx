"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { authFetch } from "../lib/authFetch";

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    desc: "Everything you need to get started.",
    features: [
      "3 resume scans / month",
      "2 cover letters / month",
      "2 job-match analyses / month",
      "2 resume tailoring sessions / month",
      "3 saved resumes and 10 tracked applications",
      "Professional cover letter tone",
      "Email support",
    ],
    cta: "Get started free",
    featured: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$15",
    period: "/month",
    desc: "All career tools, with no monthly usage caps.",
    features: [
      "Unlimited resume scans",
      "Unlimited cover letters",
      "Unlimited job-match analyses",
      "Unlimited interview prep Q&A",
      "All tone options",
      "Live voice mock interviews",
      "Unlimited resume tailoring",
      "20 saved resumes and unlimited applications",
    ],
    cta: "Upgrade to Pro",
    featured: true,
  },

];

const Check = () => (
  <svg className="w-4 h-4 shrink-0 text-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function PricingSection() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
  }, []);

  const handleCta = async (tier: typeof TIERS[number]) => {
    if (tier.id === "free") { router.push(authed ? "/dashboard" : "/login"); return; }

    if (!authed) {
      if (process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO)
        localStorage.setItem("selectedPriceId", process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO);
      router.push("/login");
      return;
    }
    if (!process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO) {
      setErr("Checkout isn't configured yet — please contact support.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await authFetch("/api/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
      else setErr("Couldn't start checkout. Please try again.");
    } catch {
      setErr("Couldn't start checkout. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <section id="pricing" className="py-24 bg-surface section-divider">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="section-label mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-fg mb-2">
            Simple pricing.
          </h2>
          <p className="text-fg-muted text-base">Start free. Upgrade when you&apos;re ready. Cancel anytime.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 items-start max-w-3xl mx-auto">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`card flex flex-col gap-5 p-6 h-full ${
                tier.featured ? "ring-2 ring-fg/15 border-border-2" : ""
              }`}
            >
              {tier.featured && (
                <span className="badge badge-accent self-start">Pro</span>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-fg-muted mb-2">
                  {tier.name}
                </p>
                <div className="flex items-end gap-1.5 mb-2">
                  <span className="text-3xl font-semibold tabular-nums text-fg">{tier.price}</span>
                  {tier.period && <span className="text-sm text-fg-subtle mb-0.5">{tier.period}</span>}
                </div>
                <p className="text-sm text-fg-muted">{tier.desc}</p>
              </div>

              <ul className="flex flex-col gap-2.5 flex-1">
                {tier.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <Check />
                    <span className="text-sm text-fg-muted">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCta(tier)}
                disabled={busy && tier.id === "pro"}
                className={`btn w-full py-2.5 disabled:opacity-50 ${
                  tier.featured ? "btn-primary" : "btn-secondary"
                }`}
              >
                {busy && tier.id === "pro" ? "Loading…" : tier.cta}
              </button>
              {err && tier.id === "pro" && (
                <p className="mt-2 text-xs text-red text-center" role="alert">{err}</p>
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-fg-muted mt-6 max-w-2xl mx-auto">Free allowances reset at the start of each calendar month (UTC). Pro renews monthly. Manage or cancel your subscription from the dashboard. Request rate limits apply to all plans.</p>
      </div>
    </section>
  );
}
