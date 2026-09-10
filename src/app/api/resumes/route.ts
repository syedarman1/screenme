// src/app/api/resumes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "../../lib/auth";
import { z } from "zod";
import { boundedRequest } from "../../lib/aiRequest";
import { savedLimitResponse } from "../../lib/savedLimits";

function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
  if (!userId)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sb = serverSupabase();
  if (!sb)
    return NextResponse.json(
      { error: "Database unavailable." },
      { status: 503 },
    );

  const id = new URL(req.url).searchParams.get("id");
  if (id !== null) {
    if (!z.string().uuid().safeParse(id).success)
      return NextResponse.json({ error: "Invalid resume." }, { status: 400 });
    const { data, error } = await sb
      .from("resume_versions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error)
      return NextResponse.json(
        { error: "Could not load resume." },
        { status: 503 },
      );
    if (!data)
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    return NextResponse.json(
      { resume: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const { data, error } = await sb
    .from("resume_versions")
    .select("id, user_id, name, score, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("GET resumes error:", error);
    return NextResponse.json(
      { error: "Failed to load resumes." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { resumes: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/* ── POST — save a new resume version ──────────────────── */
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sb = serverSupabase();
  if (!sb)
    return NextResponse.json(
      { error: "Database unavailable." },
      { status: 503 },
    );

  let body;
  try {
    body = await (await boundedRequest(req, 125000)).json();
  } catch (e) {
    return NextResponse.json(
      { error: "Resume data is invalid or too large." },
      { status: e instanceof RangeError ? 413 : 400 },
    );
  }
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(100).default("Untitled Resume"),
      content: z.string().trim().min(50).max(30000),
      score: z.number().min(0).max(100).nullable().optional(),
    })
    .safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Include a name and 50–30,000 characters of resume text." },
      { status: 400 },
    );
  const { name, content, score } = parsed.data;

  if (!content || typeof content !== "string" || content.trim().length < 50)
    return NextResponse.json(
      { error: "Resume content must be at least 50 characters." },
      { status: 400 },
    );

  const { data, error } = await sb
    .from("resume_versions")
    .insert({
      user_id: userId,
      name:
        typeof name === "string" && name.trim()
          ? name.trim().slice(0, 100)
          : "Untitled Resume",
      content: content.trim().slice(0, 30000),
      score:
        typeof score === "number" && score >= 0 && score <= 100
          ? Math.round(score)
          : null,
    })
    .select()
    .single();

  if (error) {
    const limitResponse = savedLimitResponse(error);
    if (limitResponse) return limitResponse;
    console.error("POST resumes error:", error);
    return NextResponse.json(
      { error: "Failed to save resume." },
      { status: 500 },
    );
  }

  return NextResponse.json({ resume: data }, { status: 201 });
}

/* ── PATCH — update resume version ──────────────────────── */
export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sb = serverSupabase();
  if (!sb)
    return NextResponse.json(
      { error: "Database unavailable." },
      { status: 503 },
    );

  let body;
  try {
    body = await (await boundedRequest(req, 125000)).json();
  } catch (e) {
    return NextResponse.json(
      { error: "Resume data is invalid or too large." },
      { status: e instanceof RangeError ? 413 : 400 },
    );
  }
  const parsed = z
    .object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(100).optional(),
      content: z.string().trim().min(50).max(30000).optional(),
      score: z.number().min(0).max(100).optional(),
    })
    .safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the resume name and content." },
      { status: 400 },
    );
  const { id, ...fields } = parsed.data;

  if (!id || typeof id !== "string")
    return NextResponse.json(
      { error: "Resume ID is required." },
      { status: 400 },
    );

  const allowed: Record<string, unknown> = {};
  if (typeof fields.name === "string" && fields.name.trim())
    allowed.name = fields.name.trim().slice(0, 100);
  if (typeof fields.content === "string" && fields.content.trim().length >= 50)
    allowed.content = fields.content.trim().slice(0, 30000);
  if (
    typeof fields.score === "number" &&
    fields.score >= 0 &&
    fields.score <= 100
  )
    allowed.score = Math.round(fields.score);

  if (Object.keys(allowed).length === 0)
    return NextResponse.json(
      { error: "No valid fields to update." },
      { status: 400 },
    );

  const { data, error } = await sb
    .from("resume_versions")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("PATCH resumes error:", error);
    return NextResponse.json(
      { error: "Failed to update resume." },
      { status: 500 },
    );
  }

  if (!data)
    return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  return NextResponse.json(
    { resume: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/* ── DELETE — remove resume version ─────────────────────── */
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sb = serverSupabase();
  if (!sb)
    return NextResponse.json(
      { error: "Database unavailable." },
      { status: 503 },
    );

  const { id } = await req.json().catch(() => ({}));
  if (!id || typeof id !== "string")
    return NextResponse.json(
      { error: "Resume ID is required." },
      { status: 400 },
    );

  const { error } = await sb
    .from("resume_versions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("DELETE resumes error:", error);
    return NextResponse.json(
      { error: "Failed to delete resume." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

/* ── GET single resume content (via query param) ────────── */
export async function OPTIONS() {
  // Reuse OPTIONS for CORS if needed
  return new NextResponse(null, { status: 204 });
}
