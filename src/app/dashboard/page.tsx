"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { type User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Plan {
  title: string;
  price: string;
  period?: string;
  features: string[];
  buttonText: string;
  priceId?: string;
  isCurrent?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  // auth check
  useEffect(() => {
    const checkUserAndPlan = async () => {
      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error("Failed to fetch user");
        if (!data?.user) {
          setError("Please log in to access your dashboard.");
          setLoading(false);
          return;
        }
        setUser(data.user);

        // Check if user has a plan otherwidse throww err
        const { data: planData, error: planError } = await supabase
          .from("user_plans")
          .select("plan")
          .eq("user_id", data.user.id)
          .single();
        if (planError && planError.code === "PGRST116") {
          await supabase
            .from("user_plans")
            .insert({ user_id: data.user.id, plan: "free" });
        } else if (planError) throw planError;
        setCurrentPlan(planData?.plan || "free");

        const subscription = supabase
          .channel("user_plans_changes")
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "user_plans",
              filter: `user_id=eq.${data.user.id}`,
            },
            (payload) => {
              setCurrentPlan(payload.new.plan);
            }
          )
          .subscribe();

        const priceId = localStorage.getItem("selectedPriceId");
        setSelectedPriceId(priceId);

        return () => {
          supabase.removeChannel(subscription);
        };
      } catch (e: any) {
        setError(e.message || "An error occurred while loading your dashboard");
      } finally {
        setLoading(false);
      }
    };
    checkUserAndPlan();
  }, [router]);

  const handlePlanSelection = async (planType: "free" | "pro") => {
    if (loading) return;

    const userId = user?.id;
    if (!userId) {
      setError("Please log in to select a plan.");
      return;
    }

    if (planType === "free") {
      await supabase
        .from("user_plans")
        .upsert({ user_id: userId, plan: "free" }, { onConflict: "user_id" });
      localStorage.removeItem("selectedPriceId");
      setSelectedPriceId(null);
      setCurrentPlan("free");
    } else if (planType === "pro" && process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO) {
      try {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
            userId,
          }),
        });
        const { url } = await response.json();
        if (url) {
          window.location.href = url;
          localStorage.removeItem("selectedPriceId");
        }
      } catch (error) {
        console.error("Error initiating checkout:", error);
        setError("Failed to initiate Pro plan checkout");
      }
    }
  };

  const plans: Plan[] = [
    {
      title: "Free",
      price: "$0",
      period: "/mo",
      features: [
        "2× Resume scans per month",
        "1× Cover letter per month",
        "1× Job-match analysis per month",
        "Basic tone only",
        "Email support",
      ],
      buttonText: currentPlan === "free" ? "Current Plan" : "Stay Free",
      isCurrent: currentPlan === "free",
    },
    {
      title: "Pro",
      price: "$15",
      period: "/mo",
      features: [
        "Unlimited resume scans",
        "Unlimited cover letters",
        "Unlimited job-match analysis",
        "Unlimited interview prep Q&A",
        "All tone options (Professional, Enthusiastic, Concise)",
        "Live voice interview practice",
      ],
      buttonText: currentPlan === "pro" ? "Current Plan" : "Upgrade to Pro",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
      isCurrent: currentPlan === "pro",
    },
  ];

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
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] flex items-center justify-center text-white">
        <div className="p-6 max-w-md text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-red-500"
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
          <h2 className="text-2xl font-semibold mb-4 text-gray-100">
            Access Required
          </h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            href="/login"
            className="block w-full px-4 py-2 bg-[var(--accent)] text-black font-medium rounded-lg hover:bg-yellow-500 transition text-center"
          >
            Login/Signup
          </Link>
        </div>
      </div>
    );
  }

  const userEmail = user?.email ?? "User";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center">
      <header className="pt-16 pb-8 px-6 text-center w-full max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
          Welcome, {userEmail}
        </h1>
        <p className="text-lg text-gray-400">
          Your all-in-one toolkit for job success—no more guesswork.
        </p>
      </header>

      <main className="pb-16 px-6 w-full max-w-4xl">
        <section className="mb-12">
          <h2 className="text-3xl font-semibold text-gray-200 mb-6 text-center">
            Choose Your Plan
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.title}
                className={`
                  bg-[#2a2a2a] p-6 rounded-xl shadow-lg flex flex-col
                  border-2 ${
                    plan.isCurrent
                      ? "border-[var(--accent)]"
                      : "border-transparent"
                  }
                  transition-all duration-200 hover:shadow-xl
                `}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-200">
                    {plan.title}
                  </h3>
                  {plan.isCurrent && (
                    <span className="bg-[var(--accent)] text-black text-xs font-semibold px-2 py-1 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-gray-100 mb-4">
                  {plan.price}
                  {plan.period && (
                    <span className="text-sm font-normal text-gray-400">
                      {plan.period}
                    </span>
                  )}
                </p>
                <ul className="text-gray-300 mb-6 space-y-2 text-sm flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg
                        className="h-4 w-4 text-[var(--accent)] flex-shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() =>
                    handlePlanSelection(
                      plan.title.toLowerCase() as "free" | "pro"
                    )
                  }
                  disabled={plan.isCurrent}
                  className={`
                    w-full px-6 py-2 rounded-lg font-medium transition duration-200
                    ${
                      plan.isCurrent
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : plan.title === "Free"
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-[var(--accent)] text-black hover:opacity-90"
                    }
                  `}
                >
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-semibold text-gray-200 mb-6 text-center">
            Your Tools
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-semibold text-gray-200 mb-2">
                Resume Scanner
              </h3>
              <p className="text-gray-400 text-sm flex-grow mb-4">
                Check ATS readiness & get instant feedback.
              </p>
              <Link
                href="/resume"
                className="w-full px-6 py-2 bg-[var(--accent)] text-black font-medium rounded-lg transition transform duration-200 hover:opacity-90 text-center"
                aria-label="Go to Resume Scanner"
              >
                Scan Resume
              </Link>
            </div>

            <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-semibold text-gray-200 mb-2">
                Job-Match Analyzer
              </h3>
              <p className="text-gray-400 text-sm flex-grow mb-4">
                Compare your resume vs. job description skill-fit.
              </p>
              <Link
                href="/jobmatch"
                className="w-full px-6 py-2 bg-[var(--accent)] text-black font-medium rounded-lg transition transform duration-200 hover:opacity-90 text-center"
                aria-label="Go to Job-Match Analyzer"
              >
                Analyze Match
              </Link>
            </div>

            <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-semibold text-gray-200 mb-2">
                Cover Letter
              </h3>
              <p className="text-gray-400 text-sm flex-grow mb-4">
                Auto-write a personalized cover letter.
              </p>
              <Link
                href="/coverLetter"
                className="w-full px-6 py-2 bg-[var(--accent)] text-black font-medium rounded-lg transition transform duration-200 hover:opacity-90 text-center"
                aria-label="Go to Cover Letter Generator"
              >
                Write Cover Letter
              </Link>
            </div>

            <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-semibold text-gray-200 mb-2">
                Interview Prep
              </h3>
              <p className="text-gray-400 text-sm flex-grow mb-4">
                Generate tailored Q&A from your job description.
              </p>
              <Link
                href="/interview"
                className="w-full px-6 py-2 bg-[var(--accent)] text-black font-medium rounded-lg transition transform duration-200 hover:opacity-90 text-center"
                aria-label="Go to Interview Prep"
              >
                Start Prep
              </Link>
            </div>

            <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-semibold text-gray-200 mb-2">
                LinkedIn Critique (Premium)
              </h3>
              <p className="text-gray-400 text-sm flex-grow mb-4">
                Fine-tune your LinkedIn profile. Coming soon!
              </p>
              <button
                disabled
                className="w-full px-6 py-2 bg-gray-700 text-gray-400 font-medium rounded-lg cursor-not-allowed opacity-50"
                aria-disabled="true"
                aria-label="LinkedIn Critique coming soon"
              >
                Stay Tuned
              </button>
            </div>

            <div className="bg-[#2a2a2a] rounded-xl p-6 flex flex-col shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-semibold text-gray-200 mb-2">
                Coming Soon
              </h3>
              <p className="text-gray-400 text-sm flex-grow mb-4">
                More AI-driven tools to elevate your job hunt.
              </p>
              <button
                disabled
                className="w-full px-6 py-2 bg-gray-700 text-gray-400 font-medium rounded-lg cursor-not-allowed opacity-50"
                aria-disabled="true"
                aria-label="More tools coming soon"
              >
                Stay Tuned
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
