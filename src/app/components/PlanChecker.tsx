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
        <svg className="animate-spin h-6 w-6 text-fg-muted" fill="none" viewBox="0 0 24 24">
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
        <div className="card p-8 text-center max-w-md w-full">
          <div className="mx-auto w-12 h-12 rounded-lg bg-surface-2 border border-border flex items-center justify-center mb-5">
            <svg className="w-6 h-6 text-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-fg mb-2">
            {requiredPlan === "pro" ? "Pro Feature" : "Usage Limit Reached"}
          </h3>

          <p className="text-sm text-fg-muted mb-6 leading-relaxed">
            {requiredPlan === "pro"
              ? "This feature requires a Pro subscription to access."
              : `You've used all your free ${featureLabel}s this month. Upgrade to Pro for unlimited access.`}
          </p>

          <div className="bg-surface-2 rounded-lg p-4 mb-6 text-left border border-border">
            <p className="text-xs font-semibold text-fg mb-3 uppercase tracking-wider">Pro includes</p>
            <div className="space-y-2.5">
              {[
                "Unlimited resume scans & tailoring",
                "Unlimited cover letters & job matching",
                "AI mock interview with voice",
                "Unlimited applications & saved resumes",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-green shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-fg">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {debugInfo && process.env.NODE_ENV === "development" && (
            <details className="mb-4 text-left">
              <summary className="cursor-pointer text-xs text-fg-subtle">Debug Info</summary>
              <pre className="text-xs text-fg-muted mt-1 overflow-auto bg-surface-2 p-2 rounded-lg border border-border">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}

          <button
            onClick={() => onUpgradeClick ? onUpgradeClick() : router.push("/dashboard")}
            className="btn btn-primary w-full py-3 cursor-pointer"
          >
            Upgrade to Pro — $15/mo
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
