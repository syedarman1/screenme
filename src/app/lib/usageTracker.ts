// src/lib/usageTracker.ts

import { supabase } from './supabaseClient';

export type FeatureType = 'resume_scan' | 'cover_letter' | 'job_match' | 'interview_prep';

export interface UsageCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  plan: 'free' | 'pro';
}

export async function checkUsageLimit(userId: string, feature: FeatureType): Promise<UsageCheckResult> {
  try {
    console.log(`Checking usage limit for user ${userId}, feature: ${feature}`);
    
    // Initialize user data if needed
    const initSuccess = await initializeUserData(userId);
    console.log(`User data initialization: ${initSuccess}`);

    // Get user plan and usage
    const { data: planUsageData, error } = await supabase.rpc('get_user_plan_and_usage', { 
      p_user_id: userId 
    });

    if (error) {
      console.error('Error getting user plan and usage:', error);
      return { allowed: false, limit: 0, remaining: 0, plan: 'free' };
    }

    console.log('Plan and usage data:', planUsageData);

    const data = planUsageData?.[0]; // RPC returns an array
    if (!data) {
      console.error('No plan/usage data found for user');
      return { allowed: false, limit: 0, remaining: 0, plan: 'free' };
    }

    const plan = data.plan || 'free';
    console.log(`User plan: ${plan}`);

    // Pro users have unlimited access
    if (plan === 'pro') {
      console.log('Pro user - unlimited access');
      return { allowed: true, limit: -1, remaining: -1, plan: 'pro' };
    }

    // FIXED: Updated limits to match the new SQL schema
    const limits = {
      resume_scan: 3,        // Updated from 2 to 3
      cover_letter: 2,       // Updated from 1 to 2
      job_match: 2,          // Updated from 1 to 2
      interview_prep: 0      // Remains 0 (Pro only)
    };

    const limit = limits[feature];
    console.log(`Feature limit for ${feature}: ${limit}`);
    
    // Get current usage for the feature
    const currentUsage = data[getUsageFieldName(feature)] || 0;
    console.log(`Current usage for ${feature}: ${currentUsage}`);
    
    // Check if usage needs to be reset (handled by the database function)
    const remaining = Math.max(0, limit - currentUsage);
    const allowed = currentUsage < limit;

    console.log(`Usage check result: allowed=${allowed}, remaining=${remaining}`);

    return { allowed, limit, remaining, plan: 'free' };
  } catch (error) {
    console.error('Error in checkUsageLimit:', error);
    return { allowed: false, limit: 0, remaining: 0, plan: 'free' };
  }
}

export async function incrementUsage(userId: string, feature: FeatureType): Promise<boolean> {
  try {
    console.log(`Incrementing usage for user ${userId}, feature: ${feature}`);
    
    const { data, error } = await supabase.rpc('increment_usage', {
      p_user_id: userId,
      p_feature: feature
    });

    if (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }

    console.log(`Increment result: ${data}`);
    return Boolean(data);
  } catch (error) {
    console.error('Error in incrementUsage:', error);
    return false;
  }
}

export async function canUseFeature(userId: string, feature: FeatureType): Promise<boolean> {
  try {
    console.log(`Checking if user ${userId} can use feature: ${feature}`);
    
    const { data, error } = await supabase.rpc('can_use_feature', {
      p_user_id: userId,
      p_feature: feature
    });

    if (error) {
      console.error('Error checking feature access:', error);
      return false;
    }

    console.log(`Can use feature result: ${data}`);
    return Boolean(data);
  } catch (error) {
    console.error('Error in canUseFeature:', error);
    return false;
  }
}

export async function initializeUserData(userId: string): Promise<boolean> {
  try {
    console.log(`Initializing user data for: ${userId}`);
    
    const { data, error } = await supabase.rpc('initialize_user_data', { 
      p_user_id: userId 
    });
    
    if (error) {
      console.error('Error initializing user data:', error);
      return false;
    }
    
    console.log(`Initialize result: ${data}`);
    return Boolean(data);
  } catch (error) {
    console.error('Error in initializeUserData:', error);
    return false;
  }
}

export async function getPlanUsage(userId: string) {
  try {
    console.log(`Getting plan/usage for user: ${userId}`);
    
    const { data, error } = await supabase.rpc('get_user_plan_and_usage', { 
      p_user_id: userId 
    });
    
    if (error) {
      console.error('Error getting plan/usage:', error);
      return null;
    }
    
    console.log('Plan/usage data:', data);
    return data?.[0] || null;
  } catch (error) {
    console.error('Error in getPlanUsage:', error);
    return null;
  }
}

export async function resetMonthlyUsage(): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc('reset_monthly_usage');
    
    if (error) {
      console.error('Error resetting monthly usage:', error);
      return null;
    }
    
    return data ?? null;
  } catch (error) {
    console.error('Error in resetMonthlyUsage:', error);
    return null;
  }
}

// Debug function to troubleshoot user issues
export async function debugUserStatus(userId: string) {
  try {
    console.log(`Debugging user status for: ${userId}`);
    
    const { data, error } = await supabase.rpc('debug_user_status', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('Error debugging user status:', error);
      return null;
    }
    
    console.log('Debug results:', data);
    return data?.[0] || null;
  } catch (error) {
    console.error('Error in debugUserStatus:', error);
    return null;
  }
}

// Helper function to map feature types to database field names
function getUsageFieldName(feature: FeatureType): string {
  const fieldMap = {
    resume_scan: 'resume_scans',
    cover_letter: 'cover_letters', 
    job_match: 'job_matches',
    interview_prep: 'interview_preps'
  };
  return fieldMap[feature];
}