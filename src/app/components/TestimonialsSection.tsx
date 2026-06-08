"use client";

import React from "react";

const TESTIMONIALS = [
  { id: "t1", quote: "ScreenMe transformed my job search. I went from no callbacks to 3 interviews in one week.", author: "Jane D.", role: "Software Engineer" },
  { id: "t2", quote: "The ATS feedback was brutally honest and exactly what I needed. Landed a senior role within a month.", author: "Mark S.", role: "Data Analyst" },
  { id: "t3", quote: "Generated a perfectly tailored cover letter in under a minute. The download to DOCX was a great touch.", author: "Alex K.", role: "Product Manager" },
];

function TestimonialCard({ quote, author, role }: { quote: string; author: string; role: string }) {
  return (
    <div className="card p-5 flex flex-col gap-3 h-full">
      <p className="text-sm text-fg-muted leading-relaxed flex-1">&ldquo;{quote}&rdquo;</p>
      <div className="pt-3 border-t border-border">
        <p className="text-xs font-semibold text-fg">{author}</p>
        <p className="text-xs text-fg-subtle">{role}</p>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 bg-bg section-divider">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-xl mb-10">
          <p className="section-label mb-3">Testimonials</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-fg">
            Real results from real people.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.id} {...t} />
          ))}
        </div>
      </div>
    </section>
  );
}
