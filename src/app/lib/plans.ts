export type Plan = "free" | "pro";
export const FREE_LIMITS = { resume_scan: 3, cover_letter: 2, job_match: 2, interview_prep: 0, resume_tailor: 2, job_import: 5 } as const;
export type FeatureType = keyof typeof FREE_LIMITS;
export const USAGE_FIELDS = { resume_scan: "resume_scans", cover_letter: "cover_letters", job_match: "job_matches", interview_prep: "interview_preps", resume_tailor: "resume_tailors", job_import: "job_imports" } as const;
export type Usage = Record<(typeof USAGE_FIELDS)[FeatureType], number>;
export const STORAGE_LIMITS = { free: { resumes: 3, applications: 10 }, pro: { resumes: 20, applications: null } } as const;
export const FEATURE_LABELS: Record<FeatureType, string> = { resume_scan: "Resume scans", cover_letter: "Cover letters", job_match: "Job matches", interview_prep: "Interview practice", resume_tailor: "Resume tailoring", job_import: "Job-link imports" };

export function remainingUses(plan: Plan, usage: Usage, feature: FeatureType) {
  return plan === "pro" ? null : Math.max(0, FREE_LIMITS[feature] - usage[USAGE_FIELDS[feature]]);
}

export interface DashboardData {
  plan: Plan;
  usage: Usage;
  nextResetAt: string;
  billingAvailable: boolean;
  savedResumes: number;
  applications: number;
  recentApplications: { id: string; company: string; role: string; status: string }[];
}

export function nextDashboardAction(data: DashboardData) {
  const actions = [
    { feature: "resume_scan", title: "Start with a stronger resume.", description: "Get a fresh look at your resume, with clear suggestions for what to improve.", label: "Scan my resume", href: "/resume" },
    { feature: "job_match", title: "Find where you fit.", description: "Compare your experience with a role you want and see where to focus your application.", label: "Match a job", href: "/jobmatch" },
    { feature: "resume_tailor", title: "Make your next application count.", description: "Tailor your resume to the role and bring your most relevant experience forward.", label: "Tailor my resume", href: "/tailor" },
    { feature: "cover_letter", title: "Put your experience into words.", description: "Create a cover letter that connects your background to the opportunity.", label: "Write a cover letter", href: "/coverLetter" },
  ] as const;
  const candidates = data.savedResumes > 0 ? [...actions.slice(1), actions[0]] : actions;
  return candidates.find(action => remainingUses(data.plan, data.usage, action.feature) !== 0)
    ?? { title: "Keep your search moving.", description: "Review your applications and update where things stand while your monthly allowance resets.", label: "Open my applications", href: "/applications" };
}
