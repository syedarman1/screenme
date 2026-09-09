import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "../../lib/auth";
import { supabaseAdmin as db } from "../../lib/supabaseAdmin";
import { boundedRequest } from "../../lib/aiRequest";
import { rateLimit } from "../../lib/rate-limit";
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user)
      return NextResponse.json(
        { error: "Sign in to leave feedback." },
        { status: 401 },
      );
    if (!db)
      return NextResponse.json(
        { error: "Feedback unavailable." },
        { status: 503 },
      );
    const rate = await rateLimit(`feedback:${user.id}`);
    if (!rate.success)
      return NextResponse.json(
        { error: "Please wait before updating feedback." },
        { status: 429 },
      );
    const parsed = z
      .object({ id: z.string().uuid(), helpful: z.boolean() })
      .safeParse(await (await boundedRequest(req, 1000)).json());
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid feedback." }, { status: 400 });
    const { data, error } = await db
      .from("ai_runs")
      .update({ helpful: parsed.data.helpful })
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)
      .gte("status", 200)
      .lt("status", 300)
      .select("id");
    return error
      ? NextResponse.json(
          { error: "Could not save feedback." },
          { status: 503 },
        )
      : !data?.length
        ? NextResponse.json(
            { error: "This report is no longer available for feedback." },
            { status: 404 },
          )
        : NextResponse.json(
            { saved: true },
            { headers: { "Cache-Control": "no-store" } },
          );
  } catch {
    return NextResponse.json(
      { error: "Invalid feedback request." },
      { status: 400 },
    );
  }
}
