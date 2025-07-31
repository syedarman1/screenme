"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

interface PlanCheckerProps {
  children: React.ReactNode;
  requiredPlan?: "free" | "pro";
  feature?: "resume_scan" | "cover_letter" | "job_match" | "interview_prep";
  onUpgradeClick?: () => void;
}

export default function PlanChecker({
  children,
  requiredPlan = "free",
  feature,
  onUpgradeClick,
}: PlanCheckerProps) {
  const [user, setUser] = useState<any>(null);
  const [allowed, setAllowed] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAccess() {
      if (!supabase) {
        console.log("Supabase client not available");
        setAllowed(false);
        setLoading(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.log("No authenticated user found");
          setAllowed(false);
          setLoading(false);
          return;
        }

        console.log(`Checking access for user: ${user.id}`);
        setUser(user);

        if (requiredPlan === "pro") {
          const { data: planUsageData, error } = await supabase.rpc(
            "get_user_plan_and_usage",
            { p_user_id: user.id }
          );

          console.log("Pro plan check - planUsageData:", planUsageData);

          if (error) {
            console.error("Error checking pro plan:", error);
            setAllowed(false);
            return;
          }

          // FIXED: planUsageData is an array, access first element
          const planData = planUsageData?.[0];
          if (!planData || planData.plan !== "pro") {
            console.log(`User plan: ${planData?.plan || "unknown"} - not pro`);
            setAllowed(false);
            return;
          }

          console.log("User has pro plan - access granted");
          setAllowed(true);
        } else if (feature) {
          // Check feature usage limits
          console.log(`Checking feature usage for: ${feature}`);

          const { data: canUse, error } = await supabase.rpc(
            "can_use_feature",
            { p_user_id: user.id, p_feature: feature }
          );

          console.log(`Can use ${feature}:`, canUse);

          if (error) {
            console.error("Error checking feature usage:", error);
            setAllowed(false);
            return;
          }

          // Also get debug info for troubleshooting
          const { data: debugData } = await supabase.rpc("debug_user_status", {
            p_user_id: user.id,
          });

          console.log("Debug info:", debugData?.[0]);
          setDebugInfo(debugData?.[0]);

          if (!canUse) {
            console.log(`User cannot use ${feature} - limit reached`);
            setAllowed(false);
            return;
          }

          console.log(`User can use ${feature} - access granted`);
          setAllowed(true);
        } else {
          // No specific checks needed for free plan
          setAllowed(true);
        }
      } catch (err) {
        console.error("Access check error:", err);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [requiredPlan, feature]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[var(--gray-400)]">Checking access...</div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div
        className={`flex items-center justify-center ${
          requiredPlan === "pro" ? "min-h-[700px]" : "min-h-[300px]"
        }`}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-[var(--neutral-900)] to-[var(--neutral-800)] border border-[var(--neutral-700)] rounded-2xl p-6 text-center shadow-2xl w-[800px] h-80 flex flex-col justify-center">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[var(--accent)] to-yellow-600 rounded-full opacity-10 blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full opacity-10 blur-xl transform -translate-x-8 translate-y-8"></div>

          {/* Crown/Star icon */}
          <div className="relative mx-auto w-12 h-12 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] to-yellow-500 rounded-xl opacity-20 blur-sm"></div>
            <div className="relative bg-gradient-to-r from-[var(--accent)] to-yellow-500 rounded-lg p-2">
              <svg
                className="w-8 h-8 text-black"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
            {requiredPlan === "pro" ? "Pro Feature" : "Usage Limit Reached"}
          </h3>

          <p className="text-[var(--gray-300)] mb-4 text-sm">
            {requiredPlan === "pro"
              ? "Unlock powerful features with Pro"
              : `Get unlimited ${feature?.replace("_", " ")}s with Pro`}
          </p>

          {/* Benefits list */}
          <div className="bg-[var(--neutral-800)]/50 rounded-lg p-3 mb-4 text-left">
            <div className="space-y-1 text-xs">
              <div className="flex items-center text-[var(--gray-300)]">
                <svg
                  className="w-3 h-3 text-green-400 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Unlimited resume analysis
              </div>
              <div className="flex items-center text-[var(--gray-300)]">
                <svg
                  className="w-3 h-3 text-green-400 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                AI interview preparation
              </div>
              <div className="flex items-center text-[var(--gray-300)]">
                <svg
                  className="w-3 h-3 text-green-400 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Cover letters & job matching
              </div>
            </div>
          </div>

          {/* Debug info for troubleshooting (remove in production) */}
          {debugInfo && process.env.NODE_ENV === "development" && (
            <details className="mb-2 text-left">
              <summary className="cursor-pointer text-xs text-[var(--gray-500)]">
                Debug Info (Dev Only)
              </summary>
              <pre className="text-xs text-[var(--gray-600)] mt-1 overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}

          <button
            onClick={() =>
              onUpgradeClick ? onUpgradeClick() : router.push("/dashboard")
            }
            className="relative w-full bg-gradient-to-r from-[var(--accent)] to-yellow-500 text-black font-bold py-3 px-6 rounded-lg hover:from-yellow-400 hover:to-yellow-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl group text-sm"
          >
            <span className="relative z-10">Upgrade to Pro ✨</span>
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
