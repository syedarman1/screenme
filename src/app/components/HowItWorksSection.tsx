"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";

// --- Data Definition for Steps ---
type HowItWorksStep = {
  stepNumber: number;
  title: string;
  description: string;
};

const STEPS_DATA: HowItWorksStep[] = [
  {
    stepNumber: 1,
    title: "Submit Your Information",
    description:
      "Upload your resume, connect your information, and provide the job description.",
  },
  {
    stepNumber: 2,
    title: "AI Analysis in Action",
    description:
      "Our AI reviews your details for ATS compliance and job-fit, pinpointing areas for improvement.",
  },
  {
    stepNumber: 3,
    title: "Receive Actionable Feedback",
    description:
      "Get a comprehensive report with tailored recommendations to elevate your application.",
  },
];

// --- Video Demo Data ---
const VIDEO_DEMO = {
  title: "Cover Letter Gen",
  src: "/job.mp4",
};

// --- Reusable Step Card Component ---
const StepCard = ({ step }: { step: HowItWorksStep }) => (
  <div className="text-center p-6 bg-[var(--neutral-800)] rounded-md transition-transform transform hover:scale-105 hover:bg-[var(--neutral-700)] hover:shadow-lg">
    <div className="text-4xl font-bold text-[var(--accent)] mb-4">
      {step.stepNumber}
    </div>
    <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3">
      {step.title}
    </h3>
    <p className="text-[var(--gray-300)] text-sm">
      {step.description}
    </p>
  </div>
);

// --- Main How It Works Section Component ---
const HowItWorksSection = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(error => console.error("Video play failed:", error));
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // Animation variants for entrance effects
  const cardContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
  };

  const cardItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  const videoVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.5 } },
  };

  return (
    <section id="how-it-works" className="py-20 bg-[var(--background)]">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] text-center mb-12">
          How It Works
        </h2>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={cardContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {STEPS_DATA.map((step) => (
            <motion.div key={step.stepNumber} variants={cardItemVariants}>
              <StepCard step={step} />
            </motion.div>
          ))}
        </motion.div>
        {/* Video Demo Section */}
        <motion.div
          className="mt-20 flex justify-center"
          variants={videoVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="relative group w-full max-w-6xl">
            <video
              ref={videoRef}
              src={VIDEO_DEMO.src}
              muted
              loop
              playsInline
              className="w-full rounded-xl shadow-lg group-hover:shadow-[var(--accent)]/40 transition-shadow duration-300 aspect-video object-cover"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              preload="metadata"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;