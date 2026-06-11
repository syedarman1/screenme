// src/app/lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Service-role client for trusted server-side writes. It bypasses RLS, so it
// must NEVER be imported into client ("use client") code — keep it to API
// routes and server-only libs. Returns null when env is missing so callers can
// fail closed.
export const supabaseAdmin =
  url && serviceKey && url !== "undefined" && serviceKey !== "undefined"
    ? createClient(url, serviceKey, { auth: { persistSession: false } })
    : null;
