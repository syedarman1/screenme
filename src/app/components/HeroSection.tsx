"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";

const EASE = [0.16, 1, 0.3, 1] as const;

const STATS = [
  { value: "10k+", label: "Resumes scanned"   },
  { value: "94%",  label: "Interview rate"     },
  { value: "3×",   label: "More callbacks"     },
];

export default function HeroSection() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data?.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, session) => setAuthed(!!session?.user)
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* ── Ambient glow ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[640px] h-[400px] rounded-full bg-[#fdc806] opacity-[0.06] blur-[120px]" />
        <div className="absolute top-[35%] left-[25%] w-[320px] h-[320px] rounded-full bg-[#fdc806] opacity-[0.03] blur-[80px]" />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '72px 72px' }}
        />
        {/* Radial vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, transparent 50%, #000000 100%)' }} />
      </div>

      <div className="max-w-5xl mx-auto px-6 text-center pt-28 pb-20 flex flex-col items-center gap-8">

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border border-[#fdc806]/25 bg-[#fdc806]/8 text-[#fdc806]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fdc806] animate-pulse" aria-hidden />
            AI-Powered Career Platform
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-[1.0] text-white"
        >
          Land your next
          <br />
          <span className="text-[#fdc806]">dream job.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16, ease: EASE }}
          className="text-base md:text-lg text-[#71717a] max-w-xl leading-relaxed"
        >
          Resume scoring, job-match analysis, AI cover letters, and mock interviews — everything you need to outperform the competition.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24, ease: EASE }}
          className="flex flex-col sm:flex-row gap-3 items-center"
        >
          <Link href={authed ? "/dashboard" : "/login"}>
            <button className="pricing-button px-8 py-3.5 rounded-full bg-[#fdc806] text-black text-sm font-semibold hover:bg-[#fdd835] transition-colors duration-200 cursor-pointer min-w-[160px]">
              {authed ? "Go to dashboard" : "Start for free"}
            </button>
          </Link>
          <Link href="/#features">
            <button className="px-8 py-3.5 rounded-full border border-white/[0.1] text-[#a1a1aa] text-sm font-medium hover:text-white hover:border-white/[0.2] hover:bg-white/[0.03] transition-all duration-200 cursor-pointer">
              See how it works
            </button>
          </Link>
        </motion.div>

        {/* Social proof stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.38, ease: EASE }}
          className="flex items-center gap-8 sm:gap-12 pt-4"
        >
          {STATS.map(({ value, label }, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl font-semibold text-white tabular-nums">{value}</p>
              <p className="text-xs text-[#52525b] mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
