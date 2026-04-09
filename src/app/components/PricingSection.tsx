"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

const EASE = [0.16, 1, 0.3, 1] as const;

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
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function PricingSection() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [busy,   setBusy]   = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
  }, []);

  const handleCta = async (tier: typeof TIERS[number]) => {
    if (tier.id === "enterprise") { router.push("/contact"); return; }
    if (tier.id === "free")       { router.push(authed ? "/dashboard" : "/login"); return; }

    // Pro
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
    <section id="pricing" className="py-32 border-t border-white/[0.05] relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-[#fdc806] opacity-[0.04] blur-[130px]" />
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#fdc806] mb-4">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-3">
            Simple pricing.
          </h2>
          <p className="text-[#52525b] text-base">Start free. Upgrade when you're ready. Cancel anytime.</p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-4 items-start">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: EASE }}
              className={`relative rounded-2xl flex flex-col gap-6 overflow-hidden
                ${tier.featured
                  ? "bg-[#fdc806] p-px"
                  : ""
                }`}
            >
              <div className={`flex flex-col gap-6 p-7 h-full rounded-2xl
                ${tier.featured
                  ? "bg-[#0d0b00]"
                  : "bg-[#0a0a0a] border border-white/[0.07]"
                }`}
              >
                {tier.featured && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0 text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-[#fdc806] text-black rounded-b-xl">
                    Most popular
                  </span>
                )}

                {/* Name & price */}
                <div className="pt-2">
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${tier.featured ? "text-[#fdc806]" : "text-[#52525b]"}`}>
                    {tier.name}
                  </p>
                  <div className="flex items-end gap-1.5 mb-2">
                    <span className="text-4xl font-semibold text-white tabular-nums">{tier.price}</span>
                    {tier.period && <span className="text-sm text-[#52525b] mb-1">{tier.period}</span>}
                  </div>
                  <p className="text-sm text-[#52525b]">{tier.desc}</p>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-2.5 flex-1">
                  {tier.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3">
                      <span className={tier.featured ? "text-[#fdc806]" : "text-[#52525b]"}>
                        <Check />
                      </span>
                      <span className="text-sm text-[#a1a1aa]">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleCta(tier)}
                  disabled={busy && tier.id === "pro"}
                  className={`pricing-button relative w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50
                    ${tier.featured
                      ? "bg-[#fdc806] text-black hover:bg-[#fdd835]"
                      : "bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.10]"
                    }`}
                >
                  {busy && tier.id === "pro" ? "Loading…" : tier.cta}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
