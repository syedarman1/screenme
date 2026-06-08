// src/app/lib/auth.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Anon client used only to validate access tokens server-side. We never trust
// a user id supplied by the client — the token is verified against Supabase
// Auth and the id is read from the verified user.
const authClient =
  supabaseUrl && supabaseAnonKey && supabaseUrl !== "undefined" && supabaseAnonKey !== "undefined"
    ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
    : null;

export interface AuthedUser {
  id: string;
  email?: string;
}

/**
 * Reads the `Authorization: Bearer <token>` header, validates the Supabase
 * access token, and returns the verified user. Returns null when the token is
 * missing, malformed, or invalid/expired.
 */
export async function getAuthenticatedUser(req: Request): Promise<AuthedUser | null> {
  if (!authClient) return null;

  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) return null;

  return { id: data.user.id, email: data.user.email ?? undefined };
}

/** Standard 401 response for unauthenticated requests. */
export function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: "Unauthorized. Please sign in and try again." },
    { status: 401 }
  );
}
