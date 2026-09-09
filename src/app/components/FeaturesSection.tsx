"use client";

import React from "react";

const FEATURES = [
  {
    id: "f1",
    title: "Resume Scanner V2",
    description: "Review clarity, impact, and organization with quoted evidence and practical next steps.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  },
  {
    id: "f2",
    title: "Job Match Analyzer",
    description: "Compare required and preferred qualifications against your resume, with evidence, coverage, and actionable gaps.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  },
  {
    id: "f3",
    title: "Cover Letter Generator",
    description: "Generate a tailored, editable cover letter from your resume and a job description. Choose your tone, then download as DOCX.",
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
    title: "Resume Tailoring",
    description: "Adapt your resume to a specific job description, review the suggested changes, and export your version.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  },
  {
    id: "f6",
    title: "Job Application Tracker",
    description: "Keep companies, application statuses, application dates, and notes together as your job search progresses.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },  {
    id: "f7", title: "Saved Resume Versions",
    description: "Save your original resume and tailored versions so you can choose the right one for each application.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h14v16H5zM8 4v6h8V4M8 16h8" />,
  },

];

function FeatureCard({ f }: { f: typeof FEATURES[number] }) {
  return <div className="card relative p-5 flex flex-col gap-3">
    {f.pro && <span className="badge badge-accent absolute top-4 right-4">Pro</span>}
    <div className="w-9 h-9 rounded-md flex items-center justify-center border bg-surface-2 border-border text-fg">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>{f.icon}</svg>
    </div>
    <div><h3 className="text-sm font-semibold mb-1 text-fg">{f.title}</h3><p className="text-sm leading-relaxed text-fg-muted">{f.description}</p></div>
  </div>;
}

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-bg section-divider">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-xl mb-12">
          <p className="section-label mb-3">Features</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-fg mb-3">
            Everything you need to get hired.
          </h2>
          <p className="text-fg-muted text-base leading-relaxed">
            Seven tools, one workspace — prepare your documents, practice interviews, and track applications.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <FeatureCard key={f.id} f={f} />
          ))}
        </div>
      </div>
    </section>
  );
}
