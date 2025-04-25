import React from "react";
import Link from "next/link";

const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative bg-gradient-to-r from-[#212121] to-[#212121] text-gray-100 py-24 md:py-32"
    >
      <div className="container mx-auto px-4 flex flex-col items-center justify-center text-center">
        <h1 className="heading-custom text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
          Elevate Your Career with AI-Driven Tools
        </h1>
        <p className="text-lg md:text-xl mb-10 text-gray-300 max-w-2xl">
          Upload your resume, generate a tailored cover letter, refine your
          LinkedIn, and compare against job descriptions and interview
          questions — actionable AI feedback at every step
        </p>
        <Link href="/login">
          <button className="bg-[var(--accent)] text-black font-semibold px-8 py-4 rounded-lg shadow-md transform transition duration-300 hover:scale-105 hover:opacity-90">
            Get Started
          </button>
        </Link>
      </div>
    </section>
  );
};

export default HeroSection;
