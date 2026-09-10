import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "../../lib/auth";
import { supabaseAdmin as db } from "../../lib/supabaseAdmin";
import { savedLimitResponse } from "../../lib/savedLimits";
import { boundedRequest } from "../../lib/aiRequest";
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s);
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  });
const fields = z.object({
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  status: z
    .enum(["saved", "applied", "interview", "offer", "rejected"])
    .default("saved"),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((s) => !s || /^https?:\/\//i.test(s))
    .nullable()
    .optional(),
  notes: z.string().max(10000).nullable().optional(),
  job_description: z.string().max(25000).nullable().optional(),
  applied_date: date.nullable().optional(),
});
async function handle(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return reply({ error: "Sign in to manage applications." }, 401);
  if (!db) return reply({ error: "Applications unavailable." }, 503);
  if (req.method === "GET") {
    const { data, error } = await db
      .from("job_applications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    return error
      ? reply({ error: "Could not load applications." }, 503)
      : reply({ applications: data ?? [] });
  }
  const raw = await (await boundedRequest(req, 160000)).json();
  if (req.method === "POST") {
    const parsed = fields.safeParse(raw);
    if (!parsed.success)
      return reply(
        {
          error:
            "Enter a company, role, valid date and an http(s) job link. Notes and job descriptions must fit their limits.",
        },
        400,
      );
    const { data, error } = await db
      .from("job_applications")
      .insert({ ...parsed.data, user_id: user.id })
      .select()
      .single();
    return error
      ? (savedLimitResponse(error) ??
          reply({ error: "Could not save application." }, 503))
      : reply({ application: data }, 201);
  }
  const identity = z
    .object({
      id: z.string().uuid(),
      expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
    })
    .safeParse(raw);
  if (!identity.success) return reply({ error: "Invalid application." }, 400);
  if (req.method === "DELETE") {
    const { data, error } = await db
      .from("job_applications")
      .delete()
      .eq("id", identity.data.id)
      .eq("user_id", user.id)
      .select("id");
    return error
      ? reply({ error: "Could not delete application." }, 503)
      : !data?.length
        ? reply({ error: "Application not found." }, 404)
        : reply({ success: true });
  }
  const parsed = fields.partial().safeParse(raw);
  if (!parsed.success || !Object.keys(parsed.data).length)
    return reply({ error: "Application fields are invalid." }, 400);
  let query = db
    .from("job_applications")
    .update(parsed.data)
    .eq("id", identity.data.id)
    .eq("user_id", user.id);
  if (identity.data.expectedUpdatedAt)
    query = query.eq("updated_at", identity.data.expectedUpdatedAt);
  const { data, error } = await query.select().maybeSingle();
  return error
    ? reply({ error: "Could not update application." }, 503)
    : !data
      ? reply(
          {
            error: "This application changed elsewhere. Reload before saving.",
          },
          409,
        )
      : reply({ application: data });
}
export async function GET(req: Request) {
  return handle(req).catch(() =>
    reply({ error: "Applications unavailable." }, 503),
  );
}
export async function POST(req: Request) {
  return handle(req).catch((e) =>
    reply(
      {
        error:
          e instanceof RangeError ? e.message : "Invalid application request.",
      },
      e instanceof RangeError ? 413 : 400,
    ),
  );
}
export const PATCH = POST;
export const DELETE = POST;
