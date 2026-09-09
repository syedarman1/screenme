import { NextResponse } from "next/server";

export function savedLimitResponse(error: { code?: string; message?: string; details?: string }) {
  if (error.code !== "P0001" || error.message !== "SAVED_ITEM_LIMIT") return null;
  try {
    const { resource, plan, limit } = JSON.parse(error.details || "{}");
    if (!["resume_versions", "job_applications"].includes(resource) || !["free", "pro"].includes(plan) || !Number.isInteger(limit) || limit < 1) return null;
    const item = resource === "resume_versions" ? "saved resumes" : "tracked applications";
    return NextResponse.json({ error: `Your ${plan === "pro" ? "Pro" : "Free"} plan allows ${limit} ${item}. ${plan === "pro" ? "Delete an existing item to make room." : "Upgrade to Pro or delete an existing item to make room."}`, limitReached: true, limit, plan }, { status: 403 });
  } catch { return null; }
}
