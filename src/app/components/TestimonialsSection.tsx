// src/app/components/TestimonialsSection.tsx
"use client";

import React from "react";
import Marquee from "react-fast-marquee";

const TESTIMONIALS = [
  {
    quote:
      "This service transformed my job search—my resume and LinkedIn now stand out.",
    author: "Jane D., Software Engineer",
  },
  {
    quote:
      "The AI insights were spot-on and helped me land three interviews in a week.",
    author: "Mark S., Data Analyst",
  },
  {
    quote:
      "Generating a tailored cover letter in seconds saved me hours of work.",
    author: "Alex K., Product Manager",
  },
  {
    quote:
      "Job-match scanner showed exactly which skills I lacked—like a personal coach.",
    author: "Priya R., Full-Stack Dev",
  },
  {
    quote: "Worth every penny. I feel 100 % more confident hitting “apply.”",
    author: "Luis M., UX Designer",
  },
];

const Card = ({ quote, author }: { quote: string; author: string }) => (
  <div className="inline-block w-[320px] md:w-[380px] bg-[var(--accent)] text-black rounded-lg shadow-md px-8 py-6 mx-3">
    <p className="mb-4 leading-relaxed">“{quote}”</p>
    <p className="font-semibold">— {author}</p>
  </div>
);

const TestimonialsSection = () => (
  <section id="testimonials" className="py-20 bg-[#212121] text-center">
    <h2 className="text-3xl md:text-4xl font-bold text-gray-100 mb-12">
      What Our Users Say
    </h2>

    {/* Auto-scrolling marquee */}
    <Marquee
      pauseOnHover
      gradient={false}
      speed={40}          // adjust for taste
      className="overflow-hidden"
    >
      {TESTIMONIALS.map((t, i) => (
        <Card key={i} quote={t.quote} author={t.author} />
      ))}
      {/* duplicate ensures seamless loop */}
      {TESTIMONIALS.map((t, i) => (
        <Card key={"dup" + i} quote={t.quote} author={t.author} />
      ))}
    </Marquee>
  </section>
);

export default TestimonialsSection;
