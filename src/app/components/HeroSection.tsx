// src/app/components/HeroSection.tsx
"use client";

import React, { useRef } from "react";
import Link from "next/link";

export default function HeroSection() {
  const vidRef = useRef<HTMLVideoElement>(null);

  return (
    <section
      id="home"
      className="relative bg-gradient-to-r from-[#212121] to-[#212121] text-gray-100 py-24 md:py-32"
    >
      <div className="container mx-auto px-4 flex flex-col items-center justify-center text-center">
        {/* Title */}
        <h1 className="heading-custom text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
          Elevate Your Career with AI-Driven Tools
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl mb-10 text-gray-300 max-w-2xl">
          Upload your resume, generate a tailored cover letter, refine your LinkedIn, and compare against job
          descriptions and interview questions — actionable AI feedback at every step
        </p>

        {/* Call-to-Action */}
        <Link href="/login">
          <button className="bg-[var(--accent)] text-black font-semibold px-8 py-4 rounded-lg shadow-md transform transition duration-300 hover:scale-105 hover:opacity-90">
            Get Started
          </button>
        </Link>

        {/* — Demo Video (hover to play) — */}
        <div className="mt-21 mb-2 w-full max-w-6xl">
          <video
            ref={vidRef}
            src="/resume2.mp4"
            muted
            loop
            playsInline
            className="w-full rounded-lg shadow-lg cursor-pointer"
            onMouseEnter={() => vidRef.current?.play()}
            onMouseLeave={() => vidRef.current?.pause()}
          />
        </div>
      </div>
    </section>
  );
}
