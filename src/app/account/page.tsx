"use client";
import AccountBoundary from "../components/AccountBoundary";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../lib/authFetch";
import { supabase } from "../lib/supabaseClient";
type Account = {
  savedWorkspaces: number | null;
  workspaceLimit: number;
  email: string;
  plan: string;
  billingAvailable: boolean;
  billingError: boolean;
  emailDeliveryEnabled: boolean;
  lastSyncedAt: string | null;
  billing: null | {
    status: string;
    cancelAtPeriodEnd: boolean;
    periodEnd: number | null;
    live: boolean;
  };
};
function AccountPageContent() {
  const [account, setAccount] = useState<Account | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    authFetch("/api/account")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (active) setAccount(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function portal() {
    setBusy(true);
    setError("");
    try {
      const response = await authFetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open billing.");
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    if (!account || !supabase) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        account.email,
        { redirectTo: `${location.origin}/reset-password` },
      );
      if (error) throw error;
      setMessage(
        "If this account can receive recovery emails, a link will arrive shortly.",
      );
    } catch {
      setError("Could not request a reset email. Please try again later.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page-shell">
      <div className="max-w-3xl mx-auto px-6">
        <p className="section-label">Your account</p>
        <h1 className="text-3xl mt-3 mb-8">Account and membership</h1>
        {error && (
          <p role="alert" className="mb-5">
            {error}{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </p>
        )}
        {message && (
          <p role="status" className="mb-5">
            {message}
          </p>
        )}
        {!account ? (
          <p>
            {error ? "Account details are unavailable." : "Loading account…"}
          </p>
        ) : (
          <div className="space-y-6">
            <section className="card p-6">
              <h2 className="text-xl">
                {account.plan === "pro" ? "ScreenMe Pro" : "ScreenMe Free"}
              </h2>
              {account.billing && (
                <>
                  <p className="mt-4 capitalize">
                    Subscription: {account.billing.status.replaceAll("_", " ")}
                  </p>
                  {!account.billing.live && (
                    <p className="text-sm mt-2">
                      Test subscription · no live payment
                    </p>
                  )}
                  {account.billing.periodEnd && (
                    <p className="text-sm mt-2">
                      {account.billing.cancelAtPeriodEnd
                        ? "Scheduled to end"
                        : "Current period ends"}{" "}
                      {new Date(
                        account.billing.periodEnd * 1000,
                      ).toLocaleDateString()}
                    </p>
                  )}
                  {["past_due", "unpaid", "incomplete"].includes(
                    account.billing.status,
                  ) && (
                    <p className="text-sm mt-3">
                      Your payment needs attention. Open billing to update your
                      payment method.
                    </p>
                  )}
                </>
              )}
              {account.billingError && (
                <p role="status" className="mt-4 text-sm">
                  Current billing details could not be verified. Try again
                  shortly or open billing.
                </p>
              )}
              <p className="text-sm mt-4">
                Saved tool workspaces:{" "}
                {account.savedWorkspaces ?? "Unavailable"} /{" "}
                {account.workspaceLimit}
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                {account.billingAvailable ? (
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => void portal()}
                  >
                    Manage subscription and invoices
                  </button>
                ) : (
                  <Link href="/pricing" className="btn btn-primary">
                    Explore Pro
                  </Link>
                )}
                <Link className="btn btn-secondary" href="/dashboard">
                  View allowances
                </Link>
              </div>
              <p className="text-xs text-fg-muted mt-4">
                Manage payment methods, invoices, and cancellation in billing.
                Membership updates after the payment service confirms the
                change.
              </p>
            </section>
            <section className="card p-6">
              <h2 className="text-xl">Sign-in and recovery</h2>
              <p className="text-sm mt-3 break-all">{account.email}</p>
              {account.emailDeliveryEnabled ? (
                <button
                  className="btn btn-secondary mt-5"
                  disabled={busy}
                  onClick={() => void reset()}
                >
                  Email a password reset link
                </button>
              ) : (
                <p className="text-sm text-fg-muted mt-4">
                  Recovery email delivery is awaiting sender setup.{" "}
                  <Link href="/contact" className="underline">
                    Contact support
                  </Link>{" "}
                  for help.
                </p>
              )}
            </section>
            <section className="card p-6">
              <h2 className="text-xl">Your activity</h2>
              <p className="text-sm text-fg-muted mt-3">
                See completed requests and feedback without exposing your
                document text.
              </p>
              <Link className="btn btn-secondary mt-5" href="/insights">
                View tool activity
              </Link>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AccountPage() {
  return (
    <AccountBoundary>
      <AccountPageContent />
    </AccountBoundary>
  );
}
