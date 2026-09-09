"use client";

import React from "react";

const STEPS = [
  { n: "01", title: "Upload your resume", desc: "Paste text or upload a PDF. We extract and parse it into editable text." },
  { n: "02", title: "Run AI analysis", desc: "Review your resume’s writing, or compare it with the requirements in a target job." },
  { n: "03", title: "Get your results", desc: "See quoted evidence, supported strengths, and specific next steps. Keep every claim accurate." },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-surface section-divider">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <p className="section-label mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-fg mb-4">
              Three steps to a stronger resume.
            </h2>
            <p className="text-fg-muted text-base leading-relaxed mb-10">
              Upload or paste your resume, review the feedback, and decide which changes fit your experience.
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

          <div className="card p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-xs text-fg-subtle mb-2">Example V2 review</p><h3 className="text-xl">Make your contribution clear</h3></div>
              <span className="badge badge-accent">V2</span>
            </div>
            <div className="grid grid-cols-3 gap-3 border-y border-border py-4">
              {[['Clarity', 'Strong'], ['Impact', 'Developing'], ['Organization', 'Strong']].map(([label, value]) => <div key={label}><p className="text-xs text-fg-subtle mb-2">{label}</p><p className="text-sm font-medium">{value}</p></div>)}
            </div>
            <div className="bg-bg border border-border rounded-lg p-4"><p className="section-label mb-2">From the resume</p><blockquote className="text-sm">“Led code reviews for a four-person team.”</blockquote></div>
            <div><p className="text-sm font-semibold mb-2">Connect the work to an outcome</p><p className="text-sm text-fg-muted">If accurate, describe how the reviews helped the team improve code quality. Use a result you can support; a number is optional.</p></div>
            <p className="text-xs text-fg-subtle border-t border-border pt-4">Illustrative feedback. Actual results depend on your resume.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
