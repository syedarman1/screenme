"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

interface PlanCheckerProps {
  children: React.ReactNode;
  requiredPlan?: "free" | "pro";
  feature?: "resume_scan" | "cover_letter" | "job_match" | "interview_prep" | "resume_tailor";
  onUpgradeClick?: () => void;
}

export default function PlanChecker({
  children,
  requiredPlan = "free",
  feature,
  onUpgradeClick,
}: PlanCheckerProps) {
  const [allowed, setAllowed] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAccess() {
      if (!supabase) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setAllowed(false);
          setLoading(false);
          return;
        }

        if (requiredPlan === "pro") {
          const { data: planUsageData, error } = await supabase.rpc(
            "get_user_plan_and_usage",
            { p_user_id: user.id }
          );

          if (error) { setAllowed(false); return; }

          const planData = planUsageData?.[0];
          if (!planData || planData.plan !== "pro") {
            setAllowed(false);
            return;
          }
          setAllowed(true);
        } else if (feature) {
          const { data: canUse, error } = await supabase.rpc(
            "can_use_feature",
            { p_user_id: user.id, p_feature: feature }
          );

          if (error) { setAllowed(false); return; }

          if (process.env.NODE_ENV === "development") {
            const { data: debugData } = await supabase.rpc("debug_user_status", {
              p_user_id: user.id,
            });
            setDebugInfo(debugData?.[0]);
          }

          if (!canUse) { setAllowed(false); return; }
          setAllowed(true);
        } else {
          setAllowed(true);
        }
      } catch {
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [requiredPlan, feature]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <svg className="animate-spin h-6 w-6 text-[#0071e3]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!allowed) {
    const featureLabel = feature?.replace(/_/g, " ") || "this feature";

    return (
      <div className={`flex items-center justify-center ${requiredPlan === "pro" ? "min-h-[600px]" : "min-h-[300px]"}`}>
        <div className="bg-white rounded-3xl border border-black/[0.08] shadow-sm p-10 text-center max-w-md w-full">

          {/* Icon */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#0071e3]/[0.08] border border-[#0071e3]/15 flex items-center justify-center mb-5">
            <svg className="w-7 h-7 text-[#0071e3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>

          <h3 className="text-xl font-semibold text-[#1d1d1f] mb-2">
            {requiredPlan === "pro" ? "Pro Feature" : "Usage Limit Reached"}
          </h3>

          <p className="text-sm text-[#6e6e73] mb-6 leading-relaxed">
            {requiredPlan === "pro"
              ? "This feature requires a Pro subscription to access."
              : `You've used all your free ${featureLabel}s this month. Upgrade to Pro for unlimited access.`}
          </p>

          {/* Benefits */}
          <div className="bg-[#f5f5f7] rounded-2xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-[#1d1d1f] mb-3 uppercase tracking-wider">Pro includes</p>
            <div className="space-y-2.5">
              {[
                "Unlimited resume scans & tailoring",
                "Unlimited cover letters & job matching",
                "AI mock interview with voice",
                "Unlimited applications & saved resumes",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-[#34c759] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-[#1d1d1f]">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Debug (dev only) */}
          {debugInfo && process.env.NODE_ENV === "development" && (
            <details className="mb-4 text-left">
              <summary className="cursor-pointer text-xs text-[#aeaeb2]">Debug Info</summary>
              <pre className="text-xs text-[#86868b] mt-1 overflow-auto bg-[#f5f5f7] p-2 rounded-lg">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}

          <button
            onClick={() => onUpgradeClick ? onUpgradeClick() : router.push("/dashboard")}
            className="w-full py-3.5 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            Upgrade to Pro — $15/mo
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
