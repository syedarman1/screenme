"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { type User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw new Error("Failed to fetch user");
        if (!data?.user) {
          router.push("/login");
          return;
        }
        setUser(data.user);
      } catch (e: any) {
        setError(e.message || "An error occurred while loading your dashboard");
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <svg
          className="animate-spin h-6 w-6 mr-3 text-[var(--accent)]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"
          />
        </svg>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <div
          className="p-4 bg-red-900 bg-opacity-50 text-red-300 rounded-lg flex items-center"
          role="alert"
        >
          <svg
            className="h-5 w-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </div>
      </div>
    );
  }

  const userEmail = user?.email ?? "User";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center">
      <header className="pt-28 pb-12 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Welcome, {userEmail}
        </h1>
        <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
          Your all-in-one toolkit for job success—no more guesswork on resumes, portfolios, or interviews.
        </p>
      </header>

      <main className="pb-16 px-6 w-full max-w-4xl">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Resume Scanner */}
          <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col hover:shadow-xl transition-shadow shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-200 mb-3">Resume Scanner</h2>
            <p className="text-gray-300 flex-grow mb-4">
              Check ATS readiness & get instant feedback.
            </p>
            <Link
              href="/resume"
              className="w-full px-6 py-3 bg-[var(--accent)] text-black font-medium rounded-lg transition transform duration-200 ease-out hover:-translate-y-1 hover:shadow-xl hover:opacity-90 active:translate-y-0 active:scale-95 focus:ring-2 focus:ring-[var(--accent)] text-center"
              aria-label="Go to Resume Scanner"
            >
              Scan Resume
            </Link>
          </div>

          {/* Job-Match Analysis */}
          <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col hover:shadow-xl transition-shadow shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-200 mb-3">Job-Match Analyzer</h2>
            <p className="text-gray-300 flex-grow mb-4">
              Compare your resume vs. job description skill-fit.
            </p>
            <Link
              href="/jobmatch"
              className="w-full px-6 py-3 bg-[var(--accent)] text-black font-medium rounded-lg transition transform duration-200 ease-out hover:-translate-y-1 hover:shadow-xl hover:opacity-90 active:translate-y-0 active:scale-95 focus:ring-2 focus:ring-[var(--accent)] text-center"
              aria-label="Go to Job-Match Analyzer"
            >
              Analyze Match
            </Link>
          </div>

          {/* Cover Letter Generator */}
          <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col hover:shadow-xl transition-shadow shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-200 mb-3">Cover Letter</h2>
            <p className="text-gray-300 flex-grow mb-4">
              Auto-write a personalized cover letter.
            </p>
            <Link
              href="/coverLetter"
              className="w-full px-6 py-3 bg-[var(--accent)] text-black font-medium rounded-lg transition transform duration-200 ease-out hover:-translate-y-1 hover:shadow-xl hover:opacity-90 active:translate-y-0 active:scale-95 focus:ring-2 focus:ring-[var(--accent)] text-center"
              aria-label="Go to Cover Letter Generator"
            >
              Write Cover Letter
            </Link>
          </div>

          {/* Interview Prep */}
          <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col hover:shadow-xl transition-shadow shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-200 mb-3">Interview Prep</h2>
            <p className="text-gray-300 flex-grow mb-4">
              Generate tailored Q&A from your job description.
            </p>
            <Link
              href="/interview"
              className="w-full px-6 py-3 bg-[var(--accent)] text-black font-medium rounded-lg transition transform duration-200 ease-out hover:-translate-y-1 hover:shadow-xl hover:opacity-90 active:translate-y-0 active:scale-95 focus:ring-2 focus:ring-[var(--accent)] text-center"
              aria-label="Go to Interview Prep"
            >
              Start Prep
            </Link>
          </div>

          {/* LinkedIn Critique */}
          <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col hover:shadow-xl transition-shadow shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-200 mb-3">
              LinkedIn Critique (Premium)
            </h2>
            <p className="text-gray-300 flex-grow mb-4">
              Fine-tune your LinkedIn profile. Coming soon!
            </p>
            <button
              disabled
              className="w-full px-6 py-3 bg-gray-700 text-gray-400 font-medium rounded-lg cursor-not-allowed opacity-50"
              aria-disabled="true"
              aria-label="LinkedIn Critique coming soon"
            >
              Stay Tuned
            </button>
          </div>

          {/* Coming Soon */}
          <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col hover:shadow-xl transition-shadow shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-200 mb-3">Coming Soon</h2>
            <p className="text-gray-300 flex-grow mb-4">
              More AI-driven tools to elevate your job hunt.
            </p>
            <button
              disabled
              className="w-full px-6 py-3 bg-gray-700 text-gray-400 font-medium rounded-lg cursor-not-allowed opacity-50"
              aria-disabled="true"
              aria-label="More tools coming soon"
            >
              Stay Tuned
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}