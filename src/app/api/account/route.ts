import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../lib/auth";
import { supabaseAdmin as db } from "../../lib/supabaseAdmin";
import { isOperator } from "../../lib/operator";
import {
  stripe,
  stripeId,
  subscriptionCancellationScheduled,
} from "../../lib/billing";
export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user)
    return NextResponse.json(
      { error: "Sign in to open your account." },
      { status: 401 },
    );
  if (!db)
    return NextResponse.json(
      { error: "Account unavailable." },
      { status: 503 },
    );
  const { data: plan, error } = await db
    .from("user_plans")
    .select(
      "plan,stripe_customer_id,stripe_subscription_id,subscription_status,billing_observed_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: "Account unavailable." },
      { status: 503 },
    );
  const { count: savedWorkspaces, error: workspaceError } = await db
    .from("career_workspaces")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", user.id);
  let billing: null | {
    status: string;
    cancelAtPeriodEnd: boolean;
    periodEnd: number | null;
    live: boolean;
  } = null;
  let billingError = false;
  if (plan?.stripe_subscription_id) {
    try {
      if (!stripe) throw new Error();
      const sub = await stripe.subscriptions.retrieve(
        plan.stripe_subscription_id,
      );
      if (stripeId(sub.customer) !== plan.stripe_customer_id) throw new Error();
      billing = {
        status: sub.status,
        cancelAtPeriodEnd: subscriptionCancellationScheduled(sub),
        periodEnd:
          sub.cancel_at ?? sub.items.data[0]?.current_period_end ?? null,
        live: sub.livemode,
      };
    } catch {
      billingError = true;
    }
  }
  const operator = isOperator(user.id);
  const supportCount = operator
    ? await db
        .from("contact_messages")
        .select("id", { head: true, count: "exact" })
        .eq("status", "new")
    : null;
  return NextResponse.json(
    {
      operator,
      openSupportRequests: supportCount?.error
        ? null
        : (supportCount?.count ?? null),
      savedWorkspaces: workspaceError ? null : savedWorkspaces,
      workspaceLimit: plan?.plan === "pro" ? 20 : 3,
      email: user.email,
      plan: plan?.plan ?? "free",
      billing,
      billingError,
      billingAvailable: Boolean(plan?.stripe_customer_id),
      lastSyncedAt: plan?.billing_observed_at ?? null,
      emailDeliveryEnabled:
        process.env.NEXT_PUBLIC_EMAIL_DELIVERY_ENABLED === "true",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
