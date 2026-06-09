// src/app/lib/authFetch.ts
import { supabase } from "./supabaseClient";

/**
 * fetch wrapper that attaches the current Supabase access token as a
 * `Authorization: Bearer <token>` header so the server can verify the caller.
 * Throws when the user isn't signed in — callers should already gate on auth.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  if (!supabase) throw new Error("Auth is not configured.");

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You are not signed in.");

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, { ...init, headers });
}
