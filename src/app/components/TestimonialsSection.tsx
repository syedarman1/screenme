"use client";

import React from "react";
import Marquee from "react-fast-marquee";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

const TESTIMONIALS = [
  { id: "t1", quote: "ScreenMe transformed my job search. I went from no callbacks to 3 interviews in one week.", author: "Jane D.", role: "Software Engineer" },
  { id: "t2", quote: "The ATS feedback was brutally honest and exactly what I needed. Landed a senior role within a month.", author: "Mark S.", role: "Data Analyst" },
  { id: "t3", quote: "Generated a perfectly tailored cover letter in under a minute. The download to DOCX was a great touch.", author: "Alex K.", role: "Product Manager" },
  { id: "t4", quote: "The job-match scanner felt like having a personal career coach. Showed me exactly what to add.", author: "Priya R.", role: "Full-Stack Dev" },
  { id: "t5", quote: "Worth every penny. I'm 100% more confident hitting apply on competitive roles now.", author: "Luis M.", role: "UX Designer" },
  { id: "t6", quote: "Resume score went from 54 to 89 in one afternoon following the suggestions. Incredible tool.", author: "Sarah T.", role: "Marketing Lead" },
];

const Card = React.memo(({ quote, author, role }: { quote: string; author: string; role: string }) => (
  <div className="mx-2.5 w-[300px] shrink-0 rounded-2xl border border-black/[0.08] bg-white shadow-sm p-5 flex flex-col gap-4">
    <div className="flex gap-0.5" aria-label="5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="w-3 h-3 text-[#ff9500]" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
    <p className="text-sm text-[#6e6e73] leading-relaxed flex-1">"{quote}"</p>
    <div className="pt-1 border-t border-black/[0.05]">
      <p className="text-xs font-semibold text-[#1d1d1f]">{author}</p>
      <p className="text-xs text-[#86868b]">{role}</p>
    </div>
  </div>
));
Card.displayName = "TestimonialCard";

export default function TestimonialsSection() {
  const doubled = React.useMemo(() => [...TESTIMONIALS, ...TESTIMONIALS], []);

  return (
    <section id="testimonials" className="py-32 overflow-hidden bg-white border-t border-black/[0.05]">
      <div className="max-w-6xl mx-auto px-6 mb-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
          className="text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0071e3] mb-4">Testimonials</p>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#1d1d1f]">
            Real results.
            <br />
            <span className="text-[#6e6e73]">Real people.</span>
          </h2>
        </motion.div>
      </div>

      <Marquee pauseOnHover gradient={false} speed={30}>
        {doubled.map((t, i) => <Card key={`${t.id}-${i}`} {...t} />)}
      </Marquee>
    </section>
  );
}
