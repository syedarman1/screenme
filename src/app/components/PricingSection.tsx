"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

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
      "Professional tone only",
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
    desc: "Unlimited access. No caps, no compromises.",
    features: [
      "Unlimited resume scans",
      "Unlimited cover letters",
      "Unlimited job-match analyses",
      "Unlimited interview prep Q&A",
      "All tone options",
      "Live voice mock interviews",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For teams and organisations.",
    features: [
      "Everything in Pro",
      "Team seats & analytics",
      "Dedicated support & SLAs",
      "Custom integrations",
    ],
    cta: "Contact us",
    featured: false,
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

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
  }, []);

  const handleCta = async (tier: typeof TIERS[number]) => {
    if (tier.id === "enterprise") { router.push("/contact"); return; }
    if (tier.id === "free") { router.push(authed ? "/dashboard" : "/login"); return; }

    if (!authed) {
      if (process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO)
        localStorage.setItem("selectedPriceId", process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO);
      router.push("/login");
      return;
    }
    if (!process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase!.auth.getUser();
      const res = await fetch("/api/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO, userId: user?.id }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
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

        <div className="grid md:grid-cols-3 gap-4 items-start">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`card flex flex-col gap-5 p-6 h-full ${
                tier.featured ? "ring-2 ring-fg/15 border-border-2" : ""
              }`}
            >
              {tier.featured && (
                <span className="badge badge-accent self-start">Most popular</span>
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
