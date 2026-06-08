"use client";

import React from "react";

const STEPS = [
  { n: "01", title: "Upload your resume", desc: "Paste text or upload a PDF. We extract and parse it automatically in seconds." },
  { n: "02", title: "Run AI analysis", desc: "Our models scan for ATS issues, keyword gaps, and job compatibility — instantly." },
  { n: "03", title: "Get your results", desc: "Receive a scored report with specific rewrites, missing keywords, and clear next steps." },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-surface section-divider">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <p className="section-label mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-fg mb-4">
              Three steps to your next offer.
            </h2>
            <p className="text-fg-muted text-base leading-relaxed mb-10">
              No learning curve. Paste your resume, get actionable feedback in under 30 seconds.
            </p>

            <div className="flex flex-col gap-6">
              {STEPS.map(({ n, title, desc }) => (
                <div key={n} className="flex gap-4">
                  <div className="shrink-0 w-9 h-9 rounded-md bg-surface-2 border border-border flex items-center justify-center">
                    <span className="text-xs font-bold text-fg tabular-nums">{n}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-fg mb-1">{title}</h3>
                    <p className="text-sm text-fg-muted leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-fg-subtle mb-1">Resume Score</p>
                <p className="text-3xl font-semibold text-fg tabular-nums">
                  84<span className="text-base text-fg-subtle">/100</span>
                </p>
              </div>
              <div className="px-3 py-1 rounded-md bg-surface-2 border border-border text-xs font-semibold text-fg">
                Good
              </div>
            </div>
            {[
              { label: "Keywords", pct: 78 },
              { label: "Formatting", pct: 92 },
              { label: "ATS Pass", pct: 85 },
              { label: "Impact", pct: 70 },
            ].map(({ label, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-fg-subtle">{label}</span>
                  <span className="text-fg tabular-nums font-medium">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full rounded-full bg-fg" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              {["Python", "React", "Leadership", "SQL"].map((kw) => (
                <span key={kw} className="badge badge-accent">{kw}</span>
              ))}
              {["Node.js", "AWS"].map((kw) => (
                <span key={kw} className="badge badge-muted">{kw} missing</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
