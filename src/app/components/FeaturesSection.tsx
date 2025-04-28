// src/app/components/FeaturesSection.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";

/* ---------- Feature Type ---------- */
type Feature = {
  id: string; // Added ID for key prop consistency
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>; // Icon component type
};

/* ---------- Placeholder Icons (Replace with actual SVGs/components) ---------- */
// Copied from your example FeaturesSection
const PlaceholderIconScan = ({ className }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.774 4.774zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PlaceholderIconLetter = ({ className }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;
const PlaceholderIconChat = ({ className }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.455-.017-.92-.364-1.263a3.002 3.002 0 00-.693-.653A5.975 5.975 0 013 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>;
// Add more icons if needed

/* ---------- Data ---------- */
const FEATURES_DATA: Feature[] = [
  {
    id: "f1",
    title: "ATS Resume Scanner",
    description: "Scan & score your résumé for formatting, keywords, and ATS-friendliness.",
    Icon: PlaceholderIconScan,
  },
  {
    id: "f2",
    title: "Cover Letter Generator",
    description: "Instantly craft a polished, tone-adjustable cover letter you can edit in-place.",
    Icon: PlaceholderIconLetter,
  },
  {
    id: "f3",
    title: "Targeted Interview Prep",
    description: "Practice with AI-generated questions and model answers tailored to your target role.",
    Icon: PlaceholderIconChat,
  },
  // Add more features as needed
];

/* ---------- Anim variants (Reused from Testimonials) ---------- */
const textVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
// Renamed marqueeVariants to gridVariants for clarity
const gridVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, delay: 0.3, staggerChildren: 0.1 } }, // Added staggerChildren
};
const cardVariants = { // Added for individual card animation
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

/* ---------- Card Component ---------- */
const FeatureCard = React.memo(
  ({ feature }: { feature: Feature }) => (
    <motion.div // Wrap card in motion.div for staggered animation
      variants={cardVariants}
      className="flex flex-col items-center text-center
                 bg-[var(--neutral-800)] p-6 rounded-xl shadow-lg h-full  /* Ensure cards take full height */
                 transition-shadow duration-300 hover:shadow-[var(--accent)]/40"
    >
      <div className="mb-5 text-[var(--accent)]"> {/* Increased margin-bottom slightly */}
        <feature.Icon className="h-10 w-10 md:h-12 md:w-12" /> {/* Slightly larger icon */}
      </div>
      <h3 className="text-xl md:text-2xl font-semibold text-[var(--foreground)] mb-3 leading-snug tracking-tight">
        {feature.title}
      </h3>
      <p className="text-[var(--gray-300,var(--neutral-300))] text-sm md:text-base flex-grow"> {/* Fallback color, larger text on md */}
        {feature.description}
      </p>
    </motion.div>
  )
);
FeatureCard.displayName = "FeatureCard";

/* ---------- Section ---------- */
const FeaturesSection = () => {
  return (
    <section
      id="features" // Changed ID
      className="relative py-20 md:py-28 bg-[var(--background)] text-center overflow-hidden" // Adjusted overflow, kept bg/padding
      aria-label="Application Features" // Updated aria-label
    >
      <div className="container mx-auto px-6">
        {/* Heading - Reused animation and styling */}
        <motion.h2
          variants={textVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-4xl md:text-5xl lg:text-6xl font-manrope font-semibold mb-16 md:mb-20 /* Increased margin-bottom */
                     bg-clip-text text-transparent bg-gradient-to-r
                     from-[var(--foreground)] to-[var(--accent)]"
        >
          Your AI Job Application Co-Pilot {/* Updated Heading Text */}
        </motion.h2>

        {/* Grid Container - Adapted from Marquee's motion.div */}
        <motion.div
          variants={gridVariants} // Use grid animation variants
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch" // Grid layout classes
        >
          {FEATURES_DATA.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} /> // Use FeatureCard
          ))}
        </motion.div>
      </div>

      {/* Blurred accent blobs - Reused from Testimonials */}
      <div className="absolute inset-0 -z-10 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--accent)] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[var(--yellow-400)] rounded-full blur-3xl" />
      </div>
    </section>
  );
};

export default FeaturesSection;