"use client";

import React from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  { n: "01", title: "Upload your resume", desc: "Paste text or upload a PDF. We extract and parse it automatically in seconds." },
  { n: "02", title: "Run AI analysis",     desc: "Our models scan for ATS issues, keyword gaps, and job compatibility — instantly." },
  { n: "03", title: "Get your results",    desc: "Receive a scored report with specific rewrites, missing keywords, and clear next steps." },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-32 bg-white border-t border-black/[0.05]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left — text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#0071e3] mb-4">How it works</p>
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#1d1d1f] mb-6">
                Three steps
                <br />
                <span className="text-[#6e6e73]">to your next offer.</span>
              </h2>
              <p className="text-[#6e6e73] text-base leading-relaxed mb-12">
                No learning curve. Paste your resume, get actionable feedback in under 30 seconds.
              </p>
            </motion.div>

            <div className="flex flex-col gap-8">
              {STEPS.map(({ n, title, desc }, i) => (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.08, ease: EASE }}
                  className="flex gap-5"
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[#0071e3]/8 border border-[#0071e3]/15 flex items-center justify-center">
                    <span className="text-xs font-bold text-[#0071e3] tabular-nums">{n}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">{title}</h3>
                    <p className="text-sm text-[#6e6e73] leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right — mock score card */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
            className="relative"
          >
            <div className="rounded-2xl border border-black/[0.08] bg-white shadow-lg p-8 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#86868b] mb-1">Resume Score</p>
                  <p className="text-4xl font-semibold text-[#1d1d1f] tabular-nums">84<span className="text-lg text-[#86868b]">/100</span></p>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-[#0071e3] flex items-center justify-center bg-[#0071e3]/[0.06]">
                  <span className="text-xs font-bold text-[#0071e3]">Good</span>
                </div>
              </div>
              {[
                { label: "Keywords",   pct: 78 },
                { label: "Formatting", pct: 92 },
                { label: "ATS Pass",   pct: 85 },
                { label: "Impact",     pct: 70 },
              ].map(({ label, pct }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#86868b]">{label}</span>
                    <span className="text-[#1d1d1f] tabular-nums font-medium">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.4, ease: EASE }}
                      className="h-full rounded-full bg-[#0071e3]"
                    />
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-2">
                {["Python", "React", "Leadership", "SQL"].map(kw => (
                  <span key={kw} className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#0071e3]/8 text-[#0071e3] border border-[#0071e3]/15">{kw}</span>
                ))}
                {["Node.js", "AWS"].map(kw => (
                  <span key={kw} className="px-2.5 py-1 rounded-full text-xs font-medium bg-black/[0.04] text-[#86868b] border border-black/[0.06]">{kw} missing</span>
                ))}
              </div>
            </div>

            {/* Card shadow glow */}
            <div aria-hidden className="absolute -inset-4 rounded-3xl bg-[#0071e3] opacity-[0.04] blur-2xl -z-10 pointer-events-none" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
