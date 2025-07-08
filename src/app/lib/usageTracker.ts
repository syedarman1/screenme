
import { supabase } from './supabaseClient';

export type FeatureType = 'resume_scan' | 'cover_letter' | 'job_match' | 'interview_prep';

export interface UsageCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  plan: 'free' | 'pro';
}

interface UserUsageData {
  resume_scans: number;
  cover_letters: number;
  job_matches: number;
  interview_preps: number;
  last_reset?: string;
}

interface UserPlanData {
  plan: 'free' | 'pro';
}

export async function checkUsageLimit(userId: string, feature: FeatureType): Promise<UsageCheckResult> {
  try {
    // Query user plan and usage directly from database
    const { data: planData, error: planError } = await supabase
      .from('user_plans')
      .select('plan')
      .eq('user_id', userId)
      .single();

    const { data: usageData, error: usageError } = await supabase
      .from('user_usage')
      .select('resume_scans, cover_letters, job_matches, interview_preps, last_reset')
      .eq('user_id', userId)
      .single();

    // If no plan found, create default free plan
    if (planError || !planData) {
      await supabase
        .from('user_plans')
        .upsert({ user_id: userId, plan: 'free' }, { onConflict: 'user_id' });
    }

    // If no usage found, create default usage record
    if (usageError || !usageData) {
      await supabase
        .from('user_usage')
        .upsert({ 
          user_id: userId, 
          resume_scans: 0, 
          cover_letters: 0, 
          job_matches: 0, 
          interview_preps: 0,
          last_reset: new Date().toISOString()
        }, { onConflict: 'user_id' });
    }

    // Get the actual data (use defaults if queries failed)
    const plan = planData?.plan || 'free';
    const currentUsageData: UserUsageData = usageData || {
      resume_scans: 0,
      cover_letters: 0,
      job_matches: 0,
      interview_preps: 0
    };

    // Pro users have unlimited access
    if (plan === 'pro') {
      return { allowed: true, limit: -1, remaining: -1, plan: 'pro' };
    }

    // Feature limits for free users
    const limits = {
      resume_scan: 3,        // Free users get 3 resume scans per month
      cover_letter: 2,       // Free users get 2 cover letters per month  
      job_match: 2,          // Free users get 2 job matches per month
      interview_prep: 0      // Free users get 0 interview prep (Pro only)
    };

    const limit = limits[feature];
    const fieldName = getUsageFieldName(feature);
    const currentUsage = (currentUsageData[fieldName as keyof UserUsageData] as number) || 0;
    
    // Calculate remaining and allowed status
    const remaining = Math.max(0, limit - currentUsage);
    const allowed = currentUsage < limit;

    return { 
      allowed, 
      limit, 
      remaining, 
      plan: plan as 'free' | 'pro'
    };
  } catch (error) {
    console.error('Error in checkUsageLimit:', error);
    return { allowed: false, limit: 0, remaining: 0, plan: 'free' };
  }
}

export async function incrementUsage(userId: string, feature: FeatureType): Promise<boolean> {
  try {
    const fieldName = getUsageFieldName(feature);
    
    // Get current usage value
    const { data: existingUsage, error: fetchError } = await supabase
      .from('user_usage')
      .select(`${fieldName}`)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      // Create the record if it doesn't exist
      const { error: createError } = await supabase
        .from('user_usage')
        .upsert({
          user_id: userId,
          resume_scans: feature === 'resume_scan' ? 1 : 0,
          cover_letters: feature === 'cover_letter' ? 1 : 0,
          job_matches: feature === 'job_match' ? 1 : 0,
          interview_preps: feature === 'interview_prep' ? 1 : 0,
          last_reset: new Date().toISOString()
        }, { onConflict: 'user_id' });
      
      return !createError;
    }

    // Record exists, increment it
    const currentValue = existingUsage[fieldName as keyof typeof existingUsage] || 0;
    const newValue = (currentValue as number) + 1;
    
    const { error: updateError } = await supabase
      .from('user_usage')
      .update({
        [fieldName]: newValue,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    return !updateError;
  } catch (error) {
    console.error('Error in incrementUsage:', error);
    return false;
  }
}

export async function canUseFeature(userId: string, feature: FeatureType): Promise<boolean> {
  try {
    const usageCheck = await checkUsageLimit(userId, feature);
    return usageCheck.allowed;
  } catch (error) {
    console.error('Error in canUseFeature:', error);
    return false;
  }
}

export async function initializeUserData(userId: string): Promise<boolean> {
  try {
    // Insert default records for new users
    const { error: planError } = await supabase
      .from('user_plans')
      .upsert({ user_id: userId, plan: 'free' }, { onConflict: 'user_id' });

    const { error: usageError } = await supabase
      .from('user_usage')
      .upsert({ 
        user_id: userId, 
        resume_scans: 0, 
        cover_letters: 0, 
        job_matches: 0, 
        interview_preps: 0,
        last_reset: new Date().toISOString()
      }, { onConflict: 'user_id' });
    
    return !planError && !usageError;
  } catch (error) {
    console.error('Error in initializeUserData:', error);
    return false;
  }
}

export async function getPlanUsage(userId: string) {
  try {
    // Query both tables directly
    const [planResult, usageResult] = await Promise.all([
      supabase.from('user_plans').select('*').eq('user_id', userId).single(),
      supabase.from('user_usage').select('*').eq('user_id', userId).single()
    ]);
    
    return {
      plan: planResult.data?.plan || 'free',
      ...usageResult.data
    };
  } catch (error) {
    console.error('Error in getPlanUsage:', error);
    return null;
  }
}

export async function resetMonthlyUsage(): Promise<number | null> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { count, error } = await supabase
      .from('user_usage')
      .update({
        resume_scans: 0,
        cover_letters: 0,
        job_matches: 0,
        interview_preps: 0,
        last_reset: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .lt('last_reset', thirtyDaysAgo);
    
    if (error) {
      console.error('Error resetting monthly usage:', error);
      return null;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error in resetMonthlyUsage:', error);
    return null;
  }
}

export async function debugUserStatus(userId: string) {
  try {
    // Query both tables for debugging
    const [planResult, usageResult] = await Promise.all([
      supabase.from('user_plans').select('*').eq('user_id', userId).single(),
      supabase.from('user_usage').select('*').eq('user_id', userId).single()
    ]);
    
    return {
      user_exists: true,
      plan_exists: !planResult.error,
      usage_exists: !usageResult.error,
      current_plan: planResult.data?.plan || 'unknown',
      ...usageResult.data
    };
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