// src/app/components/TestimonialsSection.tsx
"use client";

import React from "react";
import Marquee from "react-fast-marquee";
import { motion } from "framer-motion";

/* ---------- Data ---------- */
const TESTIMONIALS_DATA = [
  { id: "t1", quote: "This service transformed my job search—my resume now stands out.", author: "Jane D., Software Engineer" },
  { id: "t2", quote: "AI insights were spot-on—three interviews in a week.", author: "Mark S., Data Analyst" },
  { id: "t3", quote: "Tailored cover letters in seconds saved me hours.", author: "Alex K., Product Manager" },
  { id: "t4", quote: "Job-match scanner felt like a personal coach.", author: "Priya R., Full-Stack Dev" },
  { id: "t5", quote: "Worth every penny. I’m 100 % more confident hitting apply.", author: "Luis M., UX Designer" },
];

/* ---------- Anim variants ---------- */
const textVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
const marqueeVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, delay: 0.5 } },
};

/* ---------- Card ---------- */
const TestimonialCard = React.memo(
  ({ quote, author }: { quote: string; author: string }) => (
    <div className="mx-4 inline-block w-[320px] md:w-[380px] shrink-0
                    bg-[var(--neutral-800)] rounded-xl shadow-lg px-6 py-6
                    hover:shadow-[var(--accent)]/40 transition-shadow duration-300">
      <blockquote className="flex h-full flex-col justify-between">
        <p className="mb-4 italic leading-relaxed text-[var(--gray-200)]">“{quote}”</p>
        <footer className="mt-auto pt-2 border-t border-[var(--neutral-700)] text-right">
          <span className="font-semibold text-[var(--accent)] text-sm">— {author}</span>
        </footer>
      </blockquote>
    </div>
  )
);
TestimonialCard.displayName = "TestimonialCard";

/* ---------- Section ---------- */
const TestimonialsSection = () => {
  const testimonials = React.useMemo(
    () => [...TESTIMONIALS_DATA, ...TESTIMONIALS_DATA], // duplicate for infinite scroll
    []
  );

  return (
    <section
      id="testimonials"
      className="relative py-20 md:py-28 bg-[var(--background)] text-center overflow-x-hidden"
      aria-label="User Testimonials"
    >
      <div className="container mx-auto px-6">
        {/* Heading */}
        <motion.h2
          variants={textVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-4xl md:text-5xl lg:text-6xl font-manrope font-semibold mb-12
                     bg-clip-text text-transparent bg-gradient-to-r
                     from-[var(--foreground)] to-[var(--accent)]"
        >
          What Our Users Say
        </motion.h2>

        {/* Marquee */}
        <motion.div variants={marqueeVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <Marquee pauseOnHover gradient={false} speed={40}>
            {testimonials.map((t, i) => (
              <TestimonialCard key={`${t.id}-${i}`} quote={t.quote} author={t.author} />
            ))}
          </Marquee>
        </motion.div>
      </div>

      {/* Blurred accent blobs */}
      <div className="absolute inset-0 -z-10 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--accent)] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[var(--yellow-400)] rounded-full blur-3xl" />
      </div>
    </section>
  );
};

export default TestimonialsSection;
