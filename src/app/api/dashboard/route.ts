import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorized } from "../../lib/auth";
import { supabaseAdmin as db } from "../../lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (!db) return NextResponse.json({ error: "Dashboard unavailable. Please retry." }, { status: 503 });
  const [usage, resumes, applications, recent, billing] = await Promise.all([
    db.rpc("screenme_usage", { p_user_id: user.id }),
    db.from("resume_versions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    db.from("job_applications").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    db.from("job_applications").select("id,company,role,status").eq("user_id", user.id).order("updated_at", { ascending: false }).order("id").limit(4),
    db.from("user_plans").select("stripe_customer_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if ([usage, resumes, applications, recent, billing].some(result => result.error) || !usage.data || resumes.count === null || applications.count === null) {
    return NextResponse.json({ error: "We couldn’t load your dashboard. Please retry." }, { status: 503 });
  }
  const now = new Date();
  return NextResponse.json({ plan: usage.data.plan, usage: usage.data, savedResumes: resumes.count, applications: applications.count, recentApplications: recent.data, billingAvailable: Boolean(billing.data?.stripe_customer_id), nextResetAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
