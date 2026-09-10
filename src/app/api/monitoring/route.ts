import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../lib/auth";
import { supabaseAdmin as db } from "../../lib/supabaseAdmin";
import { isOperator } from "../../lib/operator";
export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user)
    return NextResponse.json(
      { error: "Sign in to view activity." },
      { status: 401 },
    );
  if (!db)
    return NextResponse.json(
      { error: "Activity unavailable." },
      { status: 503 },
    );
  const all = new URL(req.url).searchParams.get("scope") === "all";
  if (all && !isOperator(user.id))
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  const { data, error } = await db.rpc("screenme_ai_summary", {
    p_user_id: all ? null : user.id,
  });
  return error
    ? NextResponse.json({ error: "Activity unavailable." }, { status: 503 })
    : NextResponse.json(
        {
          rows: data,
          scope: all ? "all" : "mine",
          operator: isOperator(user.id),
          periodDays: 30,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
}
