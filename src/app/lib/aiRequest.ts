import { AsyncLocalStorage } from "node:async_hooks";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as db } from "./supabaseAdmin";
import { getAuthenticatedUser, unauthorized } from "./auth";
import { rateLimit } from "./rate-limit";

export type FeatureType = "resume_scan" | "cover_letter" | "job_match" | "interview_prep" | "resume_tailor";
export interface UsageCheckResult {
  allowed: boolean; limit: number; remaining: number; plan: "free" | "pro";
  reservationId?: string; reason?: "quota" | "busy";
}
export const requestUsage = new AsyncLocalStorage<{ userId: string; feature: FeatureType; usage: UsageCheckResult }>();

export async function boundedRequest(req: Request, maxBytes: number): Promise<NextRequest> {
  const reader = req.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    if (reader) while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new RangeError("Request is too large."); }
      chunks.push(value);
    }
  } finally { reader?.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new NextRequest(req.url, { method: req.method, headers: req.headers, body: bytes });
}

export async function withUsage(req: Request, feature: FeatureType | null, handler: (req: NextRequest) => Promise<Response>): Promise<Response> {
  let reservationId: string | undefined;
  let successful = false;
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorized();
    const rate = await rateLimit(`ai:${user.id}`);
    if (!rate.success) return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
    const bounded = await boundedRequest(req, req.headers.get("content-type")?.includes("multipart/form-data") ? 10 * 1024 * 1024 : 200_000);
    if (!feature) return await handler(bounded);
    if (!db) throw new Error("Database unavailable");
    const { data, error } = await db.rpc("screenme_usage", { p_user_id: user.id, p_feature: feature, p_consume: true });
    if (error || !data) throw new Error("Usage unavailable");
    const usage = data as UsageCheckResult;
    if (!usage.allowed) return NextResponse.json({
      error: usage.reason === "busy" ? "Please wait for your other requests to finish." : "Your monthly allowance is used up or this feature requires Pro.",
      details: { ...usage, code: usage.reason === "busy" ? "BUSY" : "USAGE_LIMIT_REACHED" },
    }, { status: usage.reason === "busy" ? 429 : 403 });
    reservationId = usage.reservationId;
    if (!reservationId) throw new Error("Usage reservation missing");
    const response = await requestUsage.run({ userId: user.id, feature, usage }, () => handler(bounded));
    successful = response.ok;
    if (successful) {
      const { error: settleError } = await db.rpc("screenme_finish_usage", { p_id: reservationId, p_success: true });
      if (settleError) { successful = false; throw new Error("Usage settlement failed"); }
      reservationId = undefined;
    }
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof RangeError ? error.message : "This service is temporarily unavailable. Please retry." }, { status: error instanceof RangeError ? 413 : 503 });
  } finally {
    if (reservationId && db) {
      const { error } = await db.rpc("screenme_finish_usage", { p_id: reservationId, p_success: successful });
      if (error) console.error("Could not settle usage reservation", { reservationId });
    }
  }
}
