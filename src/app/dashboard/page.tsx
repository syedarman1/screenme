// src/app/dashboard/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* small helper for the common button classes */
const fancyBtn =
  "w-full px-6 py-3 bg-[var(--accent)] text-black font-semibold rounded " +
  "transition transform duration-200 ease-out " +
  "hover:-translate-y-1 hover:shadow-xl hover:opacity-90 " +
  "active:translate-y-0 active:scale-95";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* ── auth ─────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) router.push("/login");
      else setUser(data.user);
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#212121] text-white">
        Loading…
      </div>
    );
  }

  const userEmail = user?.email ?? "anonymous@example.com";

  /* ── UI ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="pt-40 pb-24 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
          {userEmail} Dashboard
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
          You’re now inside your ultimate all‑in‑one toolkit—no more
          guesswork on your resume, GitHub, or portfolio.
        </p>
      </header>

      <main className="-mt-12 pb-16 px-6">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Resume Scanner */}
          <div className="bg-[#2a2a2a] rounded-xl p-4 flex flex-col hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-3">Resume Scanner</h2>
            <p className="text-gray-300 flex-grow">
              Upload or paste your resume. Our AI checks ATS readiness &
              offers actionable feedback.
            </p>
            <Link href="/resume">
              <button className={fancyBtn}>Scan Resume</button>
            </Link>
          </div>

          {/* Interview Prep */}
          <div className="bg-[#2a2a2a] rounded-xl p-4 flex flex-col hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-3">Interview Prep</h2>
            <p className="text-gray-300 flex-grow">
              Generate tailored interview questions and model answers based on
              your job description.
            </p>
            <Link href="/interview">
              <button className={fancyBtn}>Prep Interview</button>
            </Link>
          </div>

          {/* Cover Letter Generator */}
          <div className="bg-[#2a2a2a] rounded-xl p-4 flex flex-col hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-3">Cover Letter Generator</h2>
            <p className="text-gray-300 flex-grow">
              Cover Letter .
            </p>
            <Link href="/coverLetter">
            <button className={fancyBtn}>Cover Letter Generator</button>
            </Link>
          </div>

          {/* LinkedIn Critique */}
          <div className="bg-[#2a2a2a] rounded-xl p-4 flex flex-col hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-3">
              LinkedIn Critique&nbsp;(Premium)
            </h2>
            <p className="text-gray-300 flex-grow">
              Fine‑tune your LinkedIn profile. Stand out among top candidates.
            </p>
            <button className={fancyBtn}>Review LinkedIn</button>
          </div>

          {/* Job‑Match Analysis */}
          <div className="bg-[#2a2a2a] rounded-xl p-4 flex flex-col hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-3">Job‑Match Analysis</h2>
            <p className="text-gray-300 flex-grow">
              Compare your resume & GitHub with a job description. Spot any
              skill gaps.
            </p>
            <Link href="/jobmatch">
              <button className={fancyBtn}>Compare Now</button>
            </Link>
          </div>

          {/* Coming Soon */}
          <div className="bg-[#2a2a2a] rounded-xl p-4 flex flex-col hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-3">Coming Soon</h2>
            <p className="text-gray-300 flex-grow">
              More AI‑driven tools on the way to elevate your job hunt.
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


