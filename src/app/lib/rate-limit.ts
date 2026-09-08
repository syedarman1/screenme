import { createHash } from "node:crypto";
import { supabaseAdmin as db } from "./supabaseAdmin";

export async function rateLimit(key: string, limit = 10, window = 60): Promise<{ success: boolean; limit: number; remaining: number; retryAfter: number }> {
  if (!db) throw new Error("Rate limiting is unavailable.");
  const { data, error } = await db.rpc("screenme_rate_limit", {
    p_key: createHash("sha256").update(key).digest("hex"), p_limit: limit, p_window: window,
  });
  if (error || !data) throw new Error("Rate limiting is unavailable.");
  return data;
}
