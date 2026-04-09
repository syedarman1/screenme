"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const EASE = [0.16, 1, 0.3, 1] as const;

const STATS = [
  { value: "10k+",  label: "Jobs landed"      },
  { value: "94%",   label: "ATS pass rate"    },
  { value: "3×",    label: "More callbacks"   },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-[#f5f5f7] pt-16">
      {/* Blue ambient glow */}
      <div aria-hidden className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#0071e3] opacity-[0.06] rounded-full blur-[140px]" />

      {/* Subtle grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(0,113,227,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,113,227,0.04) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-8
                     border border-[#0071e3]/20 bg-[#0071e3]/[0.06] rounded-full"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] animate-pulse" />
          <span className="text-xs font-semibold text-[#0071e3] tracking-wide uppercase">
            AI-Powered Career Platform
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: EASE }}
          className="text-5xl md:text-7xl font-semibold tracking-tight text-[#1d1d1f] mb-6 leading-[1.05]"
        >
          Land your next{" "}
          <br className="hidden md:block" />
          <span className="text-[#0071e3]">dream job.</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16, ease: EASE }}
          className="text-lg md:text-xl text-[#6e6e73] max-w-2xl mx-auto leading-relaxed mb-10"
        >
          AI-powered resume analysis, cover letter generation, job matching,
          and interview prep — everything you need to get hired faster.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24, ease: EASE }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16"
        >
          <Link
            href="/login"
            className="pricing-button inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#0071e3] text-white font-semibold text-sm hover:bg-[#0077ed] transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Get started free
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/#features"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-black/[0.12] bg-white text-[#1d1d1f] font-semibold text-sm hover:bg-[#f5f5f7] hover:border-black/[0.18] transition-all duration-200 shadow-sm"
          >
            See features
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32, ease: EASE }}
          className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16"
        >
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-bold text-[#1d1d1f] tracking-tight">{value}</div>
              <div className="text-sm text-[#86868b] mt-0.5">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
        aria-hidden
      >
        <div className="w-5 h-8 rounded-full border-2 border-black/[0.15] flex items-start justify-center p-1">
          <motion.div
            className="w-1 h-1.5 rounded-full bg-[#86868b]"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
}
