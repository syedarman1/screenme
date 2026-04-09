"use client";

import React from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

const FEATURES = [
  {
    id: "f1",
    title: "ATS Resume Scanner",
    description: "Score your résumé against ATS algorithms. Get a detailed breakdown of issues, missing keywords, and suggested rewrites.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  },
  {
    id: "f2",
    title: "Job Match Analyzer",
    description: "Paste any job description and see your match score, skill gaps, and a prioritized action list to close them.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  },
  {
    id: "f3",
    title: "Cover Letter Generator",
    description: "Generate a tailored, editable cover letter in under 30 seconds. Choose your tone, then download as DOCX.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  },
  {
    id: "f4",
    title: "Interview Prep",
    description: "AI-generated Q&A tailored to your role. Live voice mock interviews with real-time AI feedback. Pro only.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />,
    pro: true,
  },
  {
    id: "f5",
    title: "LinkedIn Optimizer",
    description: "Optimize your headline, about section, and skills for maximum recruiter visibility.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    soon: true,
  },
  {
    id: "f6",
    title: "Salary Negotiator",
    description: "Get market-calibrated salary data and battle-tested negotiation scripts for your exact role.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    soon: true,
  },
];

function FeatureCard({ f, i }: { f: typeof FEATURES[number]; i: number }) {
  const muted = f.soon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: i * 0.06, ease: EASE }}
      className={`relative p-6 flex flex-col gap-4 rounded-2xl border transition-all duration-300 group
        ${muted
          ? "bg-[#050505] border-white/[0.04] opacity-50"
          : "bg-[#0a0a0a] border-white/[0.07] hover:border-[#fdc806]/30 hover:bg-[#0d0d0d]"
        }`}
    >
      {(f.pro || f.soon) && (
        <span className={`absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border
          ${f.pro ? "bg-[#fdc806]/10 text-[#fdc806] border-[#fdc806]/20"
                  : "bg-white/[0.04] text-[#52525b] border-white/[0.06]"}`}>
          {f.pro ? "Pro" : "Soon"}
        </span>
      )}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors duration-300
        ${muted
          ? "bg-white/[0.03] border-white/[0.04] text-[#3f3f46]"
          : "bg-[#fdc806]/10 border-[#fdc806]/15 text-[#fdc806] group-hover:bg-[#fdc806]/16"
        }`}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          {f.icon}
        </svg>
      </div>
      <div>
        <h3 className={`text-sm font-semibold mb-1.5 ${muted ? "text-[#3f3f46]" : "text-white"}`}>{f.title}</h3>
        <p className={`text-sm leading-relaxed ${muted ? "text-[#27272a]" : "text-[#52525b]"}`}>{f.description}</p>
      </div>
    </motion.div>
  );
}

export default function FeaturesSection() {
  return (
    <section id="features" className="py-32 relative">
      <div aria-hidden className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[600px] bg-[#fdc806] opacity-[0.03] rounded-full blur-[100px] -z-10" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
          className="max-w-xl mb-16"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#fdc806] mb-4">Features</p>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
            Everything you need
            <br />
            <span className="text-[#52525b]">to get hired.</span>
          </h2>
          <p className="text-[#52525b] text-base leading-relaxed">Six AI tools, one platform — from your first resume upload to your offer letter.</p>
        </motion.div>

        {/* 2×3 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f, i) => <FeatureCard key={f.id} f={f} i={i} />)}
        </div>
      </div>
    </section>
  );
}
