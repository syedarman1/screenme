// src/app/components/HeroSection.tsx
"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";

const DEMOS = [
  {
    title: "Resume Scanner",
    src: "/resume.mp4",
    description: "Score your resume for ATS compatibility and keywords", // Kept for potential future use, but not displayed
  },
  {
    title: "Job-Match Scanner",
    src: "/job.mp4",
    description: "Craft tailored, editable cover letters instantly", // This will be filtered out
  },
  {
    title: "Cover Letter Gen",
    src: "/cover.mp4",
    description: "Compare your skills to job postings", // Kept for potential future use, but not displayed
  },
] as const;

// Filter out the "Cover Letter Gen" demo
const filteredDemos = DEMOS.filter(demo => demo.title !== "Job-Match Scanner");

export default function HeroSection() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  // Explicitly type the ref as an array of HTMLVideoElement | null
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Ensure the ref array has the correct length based on filtered demos
  if (videoRefs.current.length !== filteredDemos.length) {
      videoRefs.current = Array(filteredDemos.length).fill(null);
  }

  const handleMouseEnter = (i: number) => {
    const video = videoRefs.current[i];
    if (video) {
      video.play().catch(error => console.error("Video play failed:", error)); // Added catch for potential errors
    }
  };

  const handleMouseLeave = (i: number) => {
    const video = videoRefs.current[i];
    if (video) {
      video.pause();
      video.currentTime = 0; // Optional: Reset video to start on mouse leave
    }
  };

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Animation variants for entrance effects (unchanged)
  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, delay: 0.3 } },
  };

  const demoContainerVariants = { // Renamed for clarity
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { delay: 0.5, duration: 0.8, staggerChildren: 0.2 } } // Added stagger
  };

  const demoItemVariants = { // Added for individual item animation
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
  };

  return (
    <section
      id="home"
      className="relative bg-[var(--background)] text-[var(--foreground)] py-20 md:py-28 overflow-hidden"
    >
      <div className="container mx-auto px-6 flex flex-col items-center justify-center text-center">
        {/* Title  */}
        <motion.h1
          className="text-4xl md:text-5xl lg:text-6xl font-manrope font-semibold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[var(--foreground)] to-[var(--accent)]"
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          Apply Smarter, Get Hired Faster
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-lg md:text-xl lg:text-2xl mb-10 text-[var(--gray-300)] max-w-3xl leading-relaxed font-inter"
          variants={textVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }} // Explicit transition property
        >
          Empower your job search with ScreenMe. Get AI-driven resume insights, job-match analysis, and interview prep in one seamless workflow.
        </motion.p>

        {/* Call-to-Action */}
        <motion.div
          variants={buttonVariants}
          initial="hidden"
          animate="visible"
        >
          <Link href={isAuthenticated ? "/dashboard" : "/login"}>
            <button className="bg-[var(--accent)] text-[var(--neutral-900)] font-inter font-semibold px-10 py-4 rounded-full shadow-lg
                               transform transition duration-300 hover:scale-105 hover:shadow-[var(--accent)]/50 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/50">
              Try ScreenMe Now
            </button>
          </Link>
        </motion.div>

        {/* Demo Section - Modified */}
        <motion.div
          className="mt-25 w-full max-w-full grid grid-cols-1 md:grid-cols-2 gap-10 justify-center items-center" // Adjusted max-w, grid-cols, gap, added justify-center
          variants={demoContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredDemos.map(({ title, src }, i) => ( // Only destructuring title (for key) and src
            <motion.div
                key={title}
                className="relative group w-full" // Removed flex col, items-center. Added w-full.
                variants={demoItemVariants} // Apply item animation
            >
              {/* Removed Title div */}
              <video
                ref={(el) => { videoRefs.current[i] = el; }}
                src={src}
                muted
                loop
                playsInline
                className="w-full rounded-xl shadow-lg group-hover:shadow-[var(--accent)]/40 transition-shadow duration-300 aspect-video object-cover" // Added aspect-video and object-cover
                onMouseEnter={() => handleMouseEnter(i)}
                onMouseLeave={() => handleMouseLeave(i)}
                preload="metadata" // Optional: Improve initial load appearance
              />
              {/* Removed Description p tag */}
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Subtle background decoration (unchanged) */}
      <div className="absolute inset-0 -z-10 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--accent)] rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[var(--yellow-400)] rounded-full filter blur-3xl" />
      </div>
    </section>
  );
}