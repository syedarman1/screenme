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
  isPopular?: boolean;
}

interface Tool {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  available: boolean;
  isPro?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<any>(null);

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

        // Check if user has a plan
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

        // Get usage stats
        const { data: usageData } = await supabase
          .from("user_usage")
          .select("*")
          .eq("user_id", data.user.id)
          .single();
        setUsageStats(usageData);

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
    } else if (planType === "pro") {
      if (!process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO) {
        setError(
          "Pro plan is not configured. Please contact support or check your environment variables."
        );
        console.error(
          "NEXT_PUBLIC_STRIPE_PRICE_PRO environment variable is not set"
        );
        return;
      }

      try {
        const response = await fetch("/api/stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
            userId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `HTTP ${response.status}: Failed to create checkout session`
          );
        }

        const { url } = await response.json();
        if (url) {
          window.location.href = url;
          localStorage.removeItem("selectedPriceId");
        } else {
          throw new Error("No checkout URL received from server");
        }
      } catch (error: any) {
        console.error("Error initiating checkout:", error);
        setError(`Failed to initiate Pro plan checkout: ${error.message}`);
      }
    }
  };

  const plans: Plan[] = [
    {
      title: "Free",
      price: "$0",
      period: "/mo",
      features: [
        "3× Resume scans per month",
        "2× Cover letters per month",
        "2× Job-match analyses per month",
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
        "All tone options",
        "Live voice interview practice",
        "Priority support",
      ],
      buttonText: currentPlan === "pro" ? "Current Plan" : "Upgrade to Pro",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
      isCurrent: currentPlan === "pro",
      isPopular: true,
    },
  ];

  const tools: Tool[] = [
    {
      title: "Resume Scanner",
      description: "AI-powered ATS optimization & instant feedback",
      href: "/resume",
      available: true,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      title: "Job Match Analyzer",
      description: "Compare your skills against job requirements",
      href: "/jobmatch",
      available: true,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      title: "Cover Letter Generator",
      description: "Create tailored cover letters in seconds",
      href: "/coverLetter",
      available: true,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: "Interview Prep",
      description: "Practice with AI-generated questions & live mock interviews",
      href: "/interview",
      available: true,
      isPro: true,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
    },
    {
      title: "LinkedIn Optimizer",
      description: "Enhance your LinkedIn profile for maximum visibility",
      href: "#",
      available: false,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: "Salary Negotiator",
      description: "Get data-driven salary insights and negotiation tips",
      href: "#",
      available: false,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="flex flex-col items-center">
          <svg
            className="animate-spin h-12 w-12 text-[var(--accent)]"
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
          <p className="mt-4 text-gray-400">Loading your dashboard...</p>
        </div>
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
  const firstName = userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="pt-20 pb-16 px-6 text-center w-full">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-light mb-4">
            Welcome back, <span className="text-[var(--accent)] font-normal">{firstName}</span>
          </h1>
          <p className="text-lg text-gray-400 font-light">
            Your AI-powered career advancement platform
          </p>
        </div>
      </header>

      <main className="pb-20 px-6 w-full max-w-6xl mx-auto">
        {/* Tools Section */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-light text-gray-100">Your Tools</h2>
            {currentPlan === "pro" && (
              <span className="px-4 py-1.5 bg-[var(--accent)] text-black text-sm font-medium rounded-full">
                PRO USER - Unlimited Access
              </span>
            )}
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <div
                key={tool.title}
                className={`relative ${!tool.available ? 'opacity-60' : ''}`}
              >
                <div className={`bg-[#1a1a1a] rounded-xl p-6 h-full flex flex-col
                  border border-[#2a2a2a] transition-all duration-300
                  ${tool.available ? 'hover:border-[#3a3a3a] hover:bg-[#1f1f1f]' : ''}
                `}>
                  {/* Coming Soon Badge */}
                  {!tool.available && (
                    <span className="absolute -top-3 right-4 px-3 py-1 bg-[#2a2a2a] text-gray-500 text-xs font-medium rounded-full uppercase tracking-wider">
                      Soon
                    </span>
                  )}
                  
                  <div className={`mb-4 ${tool.available ? 'text-[var(--accent)]' : 'text-gray-600'}`}>
                    {tool.icon}
                  </div>
                  
                  <h3 className="text-lg font-normal text-gray-100 mb-2">
                    {tool.title}
                  </h3>
                  
                  <p className="text-gray-500 text-sm flex-grow mb-6 font-light">
                    {tool.description}
                  </p>
                  
                  {tool.available ? (
                    <Link
                      href={tool.href}
                      className="w-full px-4 py-3 bg-[var(--accent)] text-black font-medium rounded-lg
                        transition-all duration-200 hover:bg-[#e6b800] text-center
                        flex items-center justify-center gap-2 group"
                    >
                      <span>Open Tool</span>
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" 
                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full px-4 py-3 bg-[#2a2a2a] text-gray-600 font-medium rounded-lg
                        cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-light text-gray-100 mb-2">Your Plan</h2>
            <p className="text-gray-500 font-light">
              {currentPlan === "free" 
                ? "Upgrade to unlock unlimited access to all features" 
                : "You have unlimited access to all features"}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.title}
                className={`relative rounded-xl p-8 flex flex-col
                  ${plan.isCurrent 
                    ? 'bg-[#1a1a1a] border-2 border-[var(--accent)]' 
                    : 'bg-[#1a1a1a] border border-[#2a2a2a]'}
                  transition-all duration-300 hover:border-[#3a3a3a]
                `}
              >
                {/* Current Plan Badge */}
                {plan.isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-[#2a2a2a] text-gray-400 text-xs font-medium rounded-full uppercase tracking-wider">
                      Current Plan
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-light text-gray-100 mb-4">
                    {plan.title}
                  </h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-light text-gray-100">{plan.price}</span>
                    {plan.period && (
                      <span className="text-gray-500 ml-1 text-lg font-light">{plan.period}</span>
                    )}
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--accent)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-400 text-sm font-light">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handlePlanSelection(plan.title.toLowerCase() as "free" | "pro")}
                  disabled={plan.isCurrent}
                  className={`w-full py-3 rounded-lg font-medium transition-all duration-200
                    ${plan.isCurrent
                      ? "bg-[#2a2a2a] text-gray-600 cursor-not-allowed"
                      : plan.title === "Pro"
                      ? "bg-[var(--accent)] text-black hover:bg-[#e6b800]"
                      : "bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]"}
                  `}
                >
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>
          
          {/* Usage Stats for Free Users */}
          {currentPlan === "free" && usageStats && (
            <div className="mt-12 max-w-2xl mx-auto">
              <h3 className="text-center text-gray-500 text-sm font-light mb-4">Monthly Usage</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#1a1a1a] rounded-lg p-4 text-center border border-[#2a2a2a]">
                  <p className="text-2xl font-light text-[var(--accent)]">{3 - (usageStats.resume_scans || 0)}/3</p>
                  <p className="text-xs text-gray-500 mt-1">Resume Scans</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-4 text-center border border-[#2a2a2a]">
                  <p className="text-2xl font-light text-[var(--accent)]">{2 - (usageStats.cover_letters || 0)}/2</p>
                  <p className="text-xs text-gray-500 mt-1">Cover Letters</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-4 text-center border border-[#2a2a2a]">
                  <p className="text-2xl font-light text-[var(--accent)]">{2 - (usageStats.job_matches || 0)}/2</p>
                  <p className="text-xs text-gray-500 mt-1">Job Matches</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}