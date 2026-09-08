import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorized } from "../../lib/auth";
import { supabaseAdmin as db } from "../../lib/supabaseAdmin";
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (!db) return NextResponse.json({ error: "Usage unavailable." }, { status: 503 });
  const { data, error } = await db.rpc("screenme_usage", { p_user_id: user.id });
  if (error) return NextResponse.json({ error: "Usage unavailable. Please retry." }, { status: 503 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
