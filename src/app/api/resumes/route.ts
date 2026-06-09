// src/app/api/resumes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "../../lib/auth";

function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getUserId(req: NextRequest): Promise<string | null> {
  const user = await getAuthenticatedUser(req);
  return user?.id ?? null;
}

/* ── GET — list resume versions ───────────────────────── */
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sb = serverSupabase();
  if (!sb) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });

  const { data, error } = await sb
    .from("resume_versions")
    .select("id, user_id, name, score, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("GET resumes error:", error);
    return NextResponse.json({ error: "Failed to load resumes." }, { status: 500 });
  }

  return NextResponse.json({ resumes: data ?? [] });
}

/* ── POST — save a new resume version ──────────────────── */
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sb = serverSupabase();
  if (!sb) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const { name, content, score } = body;

  if (!content || typeof content !== "string" || content.trim().length < 50)
    return NextResponse.json({ error: "Resume content must be at least 50 characters." }, { status: 400 });

  // Plan-based resume limit: Free = 3, Pro = 20
  const { data: planData } = await sb.from("user_plans").select("plan").eq("user_id", userId).single();
  const plan = planData?.plan || "free";
  const maxResumes = plan === "pro" ? 20 : 3;

  const { count } = await sb
    .from("resume_versions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count !== null && count >= maxResumes) {
    return NextResponse.json(
      { error: plan === "pro" ? "Maximum 20 saved resumes. Delete one first." : "Free plan allows up to 3 saved resumes. Upgrade to Pro for up to 20.", limitReached: true },
      { status: 403 }
    );
  }

  const { data, error } = await sb.from("resume_versions").insert({
    user_id: userId,
    name:    typeof name === "string" && name.trim() ? name.trim().slice(0, 100) : "Untitled Resume",
    content: content.trim().slice(0, 30000),
    score:   typeof score === "number" && score >= 0 && score <= 100 ? Math.round(score) : null,
  }).select().single();

  if (error) {
    console.error("POST resumes error:", error);
    return NextResponse.json({ error: "Failed to save resume." }, { status: 500 });
  }

  return NextResponse.json({ resume: data }, { status: 201 });
}

/* ── PATCH — update resume version ──────────────────────── */
export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sb = serverSupabase();
  if (!sb) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const { id, ...fields } = body;

  if (!id || typeof id !== "string")
    return NextResponse.json({ error: "Resume ID is required." }, { status: 400 });

  const allowed: Record<string, unknown> = {};
  if (typeof fields.name === "string" && fields.name.trim())  allowed.name    = fields.name.trim().slice(0, 100);
  if (typeof fields.content === "string" && fields.content.trim().length >= 50) allowed.content = fields.content.trim().slice(0, 30000);
  if (typeof fields.score === "number" && fields.score >= 0 && fields.score <= 100) allowed.score = Math.round(fields.score);

  if (Object.keys(allowed).length === 0)
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });

  const { data, error } = await sb
    .from("resume_versions")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("PATCH resumes error:", error);
    return NextResponse.json({ error: "Failed to update resume." }, { status: 500 });
  }

  return NextResponse.json({ resume: data });
}

/* ── DELETE — remove resume version ─────────────────────── */
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sb = serverSupabase();
  if (!sb) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });

  const { id } = await req.json().catch(() => ({}));
  if (!id || typeof id !== "string")
    return NextResponse.json({ error: "Resume ID is required." }, { status: 400 });

  const { error } = await sb
    .from("resume_versions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("DELETE resumes error:", error);
    return NextResponse.json({ error: "Failed to delete resume." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/* ── GET single resume content (via query param) ────────── */
export async function OPTIONS(req: NextRequest) {
  // Reuse OPTIONS for CORS if needed
  return new NextResponse(null, { status: 204 });
}
