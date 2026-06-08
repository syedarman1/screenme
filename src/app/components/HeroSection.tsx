"use client";

import React from "react";
import Link from "next/link";

const STATS = [
  { value: "10k+", label: "Jobs landed" },
  { value: "94%", label: "ATS pass rate" },
  { value: "3×", label: "More callbacks" },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-[92dvh] flex flex-col items-center justify-center bg-bg pt-20 pb-16">
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <p className="section-label mb-6">Career tools</p>

        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-fg mb-5 leading-[1.1]">
          Land your next job.
          <br />
          <span className="text-fg-muted font-medium">Without the guesswork.</span>
        </h1>

        <p className="text-base md:text-lg text-fg-muted max-w-xl mx-auto leading-relaxed mb-10">
          Resume analysis, cover letters, job matching, and interview prep —
          one focused workspace for your job search.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
          <Link href="/login" className="btn btn-primary px-7 py-3">
            Get started free
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/#features" className="btn btn-secondary px-7 py-3">
            See features
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-14 pt-8 border-t border-border">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-semibold text-fg tracking-tight">{value}</div>
              <div className="text-sm text-fg-subtle mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
