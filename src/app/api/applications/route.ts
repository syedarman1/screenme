// src/app/api/applications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "../../lib/auth";

function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const VALID_STATUSES = ["saved", "applied", "interview", "offer", "rejected"] as const;
type Status = typeof VALID_STATUSES[number];

async function getUserId(req: NextRequest): Promise<string | null> {
  const user = await getAuthenticatedUser(req);
  return user?.id ?? null;
}

/* ── GET — list all applications ───────────────────────── */
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sb = serverSupabase();
  if (!sb) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });

  const { data, error } = await sb
    .from("job_applications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET applications error:", error);
    return NextResponse.json({ error: "Failed to load applications." }, { status: 500 });
  }

  return NextResponse.json({ applications: data ?? [] });
}

/* ── POST — create application ──────────────────────────── */
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sb = serverSupabase();
  if (!sb) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const { company, role, status = "saved", url, notes, job_description, applied_date } = body;

  if (!company || typeof company !== "string" || company.trim().length === 0)
    return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  if (!role || typeof role !== "string" || role.trim().length === 0)
    return NextResponse.json({ error: "Role is required." }, { status: 400 });
  if (!VALID_STATUSES.includes(status as Status))
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  /* ── Plan-based limit check ── */
  const { data: planData } = await sb.from("user_plans").select("plan").eq("user_id", userId).single();
  const plan = planData?.plan || "free";

  if (plan !== "pro") {
    const { count } = await sb
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (count !== null && count >= 10) {
      return NextResponse.json(
        { error: "Free plan allows up to 10 applications. Upgrade to Pro for unlimited tracking.", limitReached: true },
        { status: 403 }
      );
    }
  }

  const { data, error } = await sb.from("job_applications").insert({
    user_id:         userId,
    company:         company.trim().slice(0, 200),
    role:            role.trim().slice(0, 200),
    status,
    url:             typeof url === "string" ? url.trim().slice(0, 500) : null,
    notes:           typeof notes === "string" ? notes.trim().slice(0, 2000) : null,
    job_description: typeof job_description === "string" ? job_description.slice(0, 10000) : null,
    applied_date:    typeof applied_date === "string" ? applied_date : null,
  }).select().single();

  if (error) {
    console.error("POST applications error:", error);
    return NextResponse.json({ error: "Failed to save application." }, { status: 500 });
  }

  return NextResponse.json({ application: data }, { status: 201 });
}

/* ── PATCH — update application ─────────────────────────── */
export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sb = serverSupabase();
  if (!sb) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const { id, ...fields } = body;

  if (!id || typeof id !== "string")
    return NextResponse.json({ error: "Application ID is required." }, { status: 400 });

  const allowed: Record<string, unknown> = {};
  if (typeof fields.company === "string")         allowed.company         = fields.company.trim().slice(0, 200);
  if (typeof fields.role === "string")             allowed.role            = fields.role.trim().slice(0, 200);
  if (VALID_STATUSES.includes(fields.status))     allowed.status          = fields.status;
  if (typeof fields.url === "string")              allowed.url             = fields.url.trim().slice(0, 500);
  if (fields.url === null)                         allowed.url             = null;
  if (typeof fields.notes === "string")            allowed.notes           = fields.notes.slice(0, 2000);
  if (typeof fields.job_description === "string")  allowed.job_description = fields.job_description.slice(0, 10000);
  if (typeof fields.applied_date === "string")     allowed.applied_date    = fields.applied_date;
  if (fields.applied_date === null)                allowed.applied_date    = null;

  if (Object.keys(allowed).length === 0)
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });

  const { data, error } = await sb
    .from("job_applications")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("PATCH applications error:", error);
    return NextResponse.json({ error: "Failed to update application." }, { status: 500 });
  }

  return NextResponse.json({ application: data });
}

/* ── DELETE — remove application ────────────────────────── */
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sb = serverSupabase();
  if (!sb) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });

  const { id } = await req.json().catch(() => ({}));
  if (!id || typeof id !== "string")
    return NextResponse.json({ error: "Application ID is required." }, { status: 400 });

  const { error } = await sb
    .from("job_applications")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("DELETE applications error:", error);
    return NextResponse.json({ error: "Failed to delete application." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
