"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface PlanCheckerProps {
  children: React.ReactNode;
  requiredPlan?: 'free' | 'pro';
  feature?: 'resume_scan' | 'cover_letter' | 'job_match' | 'interview_prep';
  onUpgradeClick?: () => void;
}

export default function PlanChecker({
  children,
  requiredPlan = 'free',
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
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('No authenticated user found');
          setAllowed(false);
          setLoading(false);
          return;
        }

        console.log(`Checking access for user: ${user.id}`);
        setUser(user);

        if (requiredPlan === 'pro') {
          // Check if user has pro plan
          const { data: planUsageData, error } = await supabase
            .rpc('get_user_plan_and_usage', { p_user_id: user.id });
          
          console.log('Pro plan check - planUsageData:', planUsageData);
          
          if (error) {
            console.error('Error checking pro plan:', error);
            setAllowed(false);
            return;
          }

          // FIXED: planUsageData is an array, access first element
          const planData = planUsageData?.[0];
          if (!planData || planData.plan !== 'pro') {
            console.log(`User plan: ${planData?.plan || 'unknown'} - not pro`);
            setAllowed(false);
            return;
          }
          
          console.log('User has pro plan - access granted');
          setAllowed(true);
          
        } else if (feature) {
          // Check feature usage limits
          console.log(`Checking feature usage for: ${feature}`);
          
          const { data: canUse, error } = await supabase
            .rpc('can_use_feature', { p_user_id: user.id, p_feature: feature });
          
          console.log(`Can use ${feature}:`, canUse);
          
          if (error) {
            console.error('Error checking feature usage:', error);
            setAllowed(false);
            return;
          }

          // Also get debug info for troubleshooting
          const { data: debugData } = await supabase
            .rpc('debug_user_status', { p_user_id: user.id });
          
          console.log('Debug info:', debugData?.[0]);
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
        console.error('Access check error:', err);
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
      <div className="bg-[var(--neutral-800)] border border-[var(--neutral-700)] rounded-xl p-6 text-center">
        <h3 className="text-xl font-semibold text-[var(--gray-200)] mb-2">
          {requiredPlan === 'pro' ? 'Pro Feature' : 'Usage Limit Reached'}
        </h3>
        <p className="text-[var(--gray-400)] mb-4">
          {requiredPlan === 'pro'
            ? 'This feature is only available for Pro users.'
            : `Upgrade to Pro for unlimited ${feature?.replace('_', ' ')}s.`}
        </p>
        
        {/* Debug info for troubleshooting (remove in production) */}
        {debugInfo && process.env.NODE_ENV === 'development' && (
          <details className="mb-4 text-left">
            <summary className="cursor-pointer text-sm text-[var(--gray-500)]">
              Debug Info (Dev Only)
            </summary>
            <pre className="text-xs text-[var(--gray-600)] mt-2 overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        )}
        
        <button
          onClick={() => (onUpgradeClick ? onUpgradeClick() : router.push('/dashboard'))}
          className="bg-[var(--accent)] text-black font-semibold px-6 py-2 rounded-lg hover:opacity-90 transition"
        >
          Upgrade to Pro
        </button>
      </div>
    );
  }

  return <>{children}</>;
}