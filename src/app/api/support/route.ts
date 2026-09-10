import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "../../lib/auth";
import { isOperator } from "../../lib/operator";
import { supabaseAdmin as db } from "../../lib/supabaseAdmin";
import { boundedRequest } from "../../lib/aiRequest";
const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function handle(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return reply({ error: "Sign in to open support." }, 401);
  if (!isOperator(user.id))
    return reply(
      { error: "This inbox is only available to ScreenMe support." },
      403,
    );
  if (!db) return reply({ error: "Support inbox unavailable." }, 503);
  if (req.method === "GET") {
    const params = new URL(req.url).searchParams;
    const parsed = z
      .object({
        status: z.enum(["new", "handled"]).default("new"),
        page: z.coerce.number().int().min(0).max(10000).default(0),
      })
      .safeParse(Object.fromEntries(params));
    if (!parsed.success) return reply({ error: "Invalid inbox filter." }, 400);
    const { status, page } = parsed.data;
    const { data, error, count } = await db
      .from("contact_messages")
      .select("id,name,email,subject,message,status,created_at", {
        count: "exact",
      })
      .eq("status", status)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(page * 25, page * 25 + 24);
    if (error) return reply({ error: "Could not load support requests." }, 503);
    return reply({ messages: data, total: count, page });
  }
  const body = await (await boundedRequest(req, 2000)).json();
  const parsed = z
    .object({
      id: z.string().uuid(),
      status: z.enum(["new", "handled"]),
      previousStatus: z.enum(["new", "handled"]),
    })
    .safeParse(body);
  if (!parsed.success) return reply({ error: "Invalid support update." }, 400);
  const { id, status, previousStatus } = parsed.data;
  const { data, error } = await db
    .from("contact_messages")
    .update({ status })
    .eq("id", id)
    .eq("status", previousStatus)
    .select("id,status")
    .maybeSingle();
  if (error) return reply({ error: "Could not update this request." }, 503);
  if (!data)
    return reply(
      { error: "This request changed elsewhere. Refresh the inbox." },
      409,
    );
  return reply({ message: data });
}
async function safeHandle(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    return reply(
      {
        error:
          e instanceof RangeError
            ? "Support update is too large."
            : "Support is temporarily unavailable.",
      },
      e instanceof RangeError ? 413 : 503,
    );
  }
}
export const GET = safeHandle;
export const PATCH = safeHandle;
