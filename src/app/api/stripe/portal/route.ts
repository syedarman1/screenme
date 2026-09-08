import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorized } from "../../../lib/auth";
import { stripe, appUrl } from "../../../lib/billing";
import { supabaseAdmin as db } from "../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (!stripe || !db) return NextResponse.json({ error: "Billing unavailable." }, { status: 503 });
  try {
    const { data, error } = await db.from("user_plans").select("stripe_customer_id").eq("user_id", user.id).single();
    if (error) throw error;
    if (!data.stripe_customer_id) return NextResponse.json({ error: "No billing account is linked yet." }, { status: 404 });
    const session = await stripe.billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${appUrl()}/dashboard` });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Could not open billing management. Please retry or contact support." }, { status: 503 });
  }
}
