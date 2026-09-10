import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "../../lib/auth";
import { supabaseAdmin as db } from "../../lib/supabaseAdmin";
import { boundedRequest } from "../../lib/aiRequest";
import { workspaceKind } from "../../lib/workspace";
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return reply({ error: "Sign in to open an application." }, 401);
  if (!db) return reply({ error: "Saved work unavailable." }, 503);
  const id = new URL(req.url).searchParams.get("id");
  if (!z.string().uuid().safeParse(id).success)
    return reply({ error: "Invalid application." }, 400);
  const { data: application, error } = await db
    .from("job_applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return reply({ error: "Could not load application." }, 503);
  if (!application) return reply({ error: "Application not found." }, 404);
  const { data: links, error: linkError } = await db
    .from("application_workspaces")
    .select("career_workspaces(id,kind,title,payload,revision,updated_at)")
    .eq("application_id", id)
    .eq("user_id", user.id);
  return linkError
    ? reply({ error: "Could not load linked work." }, 503)
    : reply({
        application,
        workspaces: links?.map((row) => row.career_workspaces) ?? [],
      });
}
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return reply({ error: "Sign in to link your work." }, 401);
    if (!db) return reply({ error: "Saved work unavailable." }, 503);
    const raw = await (await boundedRequest(req, 210000)).json();
    const parsed = z
      .object({
        applicationId: z.string().uuid(),
        workspaceId: z.string().uuid().optional(),
        kind: workspaceKind.optional(),
        resume: z.string().max(50000).default(""),
      })
      .safeParse(raw);
    if (!parsed.success)
      return reply({ error: "Invalid application work." }, 400);
    const { applicationId, workspaceId, kind, resume } = parsed.data;
    if (workspaceId) {
      const { error } = await db
        .from("application_workspaces")
        .upsert({
          application_id: applicationId,
          workspace_id: workspaceId,
          user_id: user.id,
        });
      return error
        ? reply(
            {
              error:
                "These items could not be linked. Check that both belong to your account.",
            },
            400,
          )
        : reply({ id: workspaceId });
    }
    if (!kind) return reply({ error: "Choose a tool." }, 400);
    const { data, error } = await db.rpc("screenme_start_application_work", {
      p_user_id: user.id,
      p_application_id: applicationId,
      p_kind: kind,
      p_resume: resume,
    });
    if (error)
      return reply(
        {
          error: error.message.includes("WORKSPACE_LIMIT")
            ? "Your saved workspace limit is reached (Free: 3, Pro: 20). Delete older saved work to make room."
            : "Could not start this application workspace.",
        },
        error.message.includes("WORKSPACE_LIMIT") ? 403 : 400,
      );
    return reply({ id: data }, 201);
  } catch (e) {
    return reply(
      {
        error:
          e instanceof RangeError
            ? e.message
            : "Could not save application work.",
      },
      e instanceof RangeError ? 413 : 400,
    );
  }
}
