
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Check if user is logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        // If no user found, redirect to /login
        router.push("/login");
      } else {
        setUser(data.user);
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  // 2. Loading indicator
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#212121] text-white">
        Loading...
      </div>
    );
  }

  // 3. Main Dashboard Layout
  const userEmail = user?.email || "anonymous@example.com";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero / Welcome Section with extra top spacing */}
      <header className="pt-40 pb-24 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
          {userEmail} Dashboard
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
          You’re now inside your Ultimate All in one Toolkit, no more guesswork on your
          resume, GitHub, or portfolio.
        </p>
      </header>

      {/* Cards Section */}
      <main className="-mt-12 pb-16 px-6">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Resume Scanner */}
          <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-3">Resume Scanner</h2>
            <p className="text-gray-300 flex-grow">
              Upload or paste your resume. Our AI checks ATS readiness & offers
              actionable feedback.
            </p>
            <Link href="/resume">
            <button className="mt-4 px-6 py-3 w-full bg-[var(--accent)] text-black font-semibold rounded hover:opacity-90 transition">
              Scan Resume
            </button>
            </Link>
          </div>

          {/* GitHub Screener */}
          <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-3">GitHub Screener</h2>
            <p className="text-gray-300 flex-grow">
              Evaluate repos for clarity & impressiveness. Spot areas for
              improvement.
            </p>
            <button className="mt-4 py-2 bg-[var(--accent)] text-black font-semibold rounded hover:opacity-90 transition">
              Review GitHub
            </button>
          </div>

          {/* Portfolio Review */}
          <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-3">Portfolio Review</h2>
            <p className="text-gray-300 flex-grow">
              Paste your portfolio URL. Get instant layout & copy feedback.
              Impress potential employers.
            </p>
            <button className="mt-4 py-2 bg-[var(--accent)] text-black font-semibold rounded hover:opacity-90 transition">
              Analyze Portfolio
            </button>
          </div>

          {/* LinkedIn Critique (Premium) */}
          <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-3">
              LinkedIn Critique (Premium)
            </h2>
            <p className="text-gray-300 flex-grow">
              Fine-tune your LinkedIn profile. Stand out among top candidates.
            </p>
            <button className="mt-4 py-2 bg-[var(--accent)] text-black font-semibold rounded hover:opacity-90 transition">
              Review LinkedIn
            </button>
          </div>

          {/* Job-Match Analysis */}
          <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-3">Job-Match Analysis</h2>
            <p className="text-gray-300 flex-grow">
              Compare your resume & GitHub with a job description. Spot any
              skill gaps.
            </p>
            <button className="mt-4 py-2 bg-[var(--accent)] text-black font-semibold rounded hover:opacity-90 transition">
              Compare Now
            </button>
          </div>

          {/* Coming Soon */}
          <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-3">Coming Soon</h2>
            <p className="text-gray-300 flex-grow">
              More AI-driven tools on the way to elevate your job hunt.
            </p>
            <button
              disabled
              className="mt-4 py-2 bg-gray-600 text-gray-400 font-semibold rounded cursor-not-allowed"
            >
              Stay Tuned
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
