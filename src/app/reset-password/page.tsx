"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (new URLSearchParams(window.location.hash.slice(1)).has("error")) {
      setError(
        "This reset link is invalid or expired. Request a new link from sign in.",
      );
      return;
    }
    if (!supabase) {
      setError("Account service is unavailable.");
      return;
    }
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        active &&
        session &&
        ["PASSWORD_RECOVERY", "SIGNED_IN", "INITIAL_SESSION"].includes(event)
      )
        setReady(true);
    });
    // getSession waits for URL/session initialization, including recovery links.
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.session)
        setError(
          "This reset link is invalid or expired. Request a new link from sign in.",
        );
      else setReady(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 12) {
      setError("Use at least 12 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    if (!supabase || !ready) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirm("");
      setDone(true);
      await supabase.auth.signOut({ scope: "global" });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not update your password. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page-shell">
      <div className="max-w-md mx-auto px-6 py-24">
        <h1 className="text-3xl font-semibold mb-6">Set a new password</h1>
        {done ? (
          <div role="status">
            <p className="mb-4">
              Your password has been updated. Sign in with your new password.
            </p>
            <Link className="btn btn-primary" href="/login">
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="card p-6 space-y-4">
            <label className="block">
              New password
              <input
                className="input w-full mt-2"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                disabled={!ready}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="block">
              Confirm new password
              <input
                className="input w-full mt-2"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                disabled={!ready}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </label>
            <p className="text-sm text-fg-muted">
              Use at least 12 characters. A unique passphrase works well.
            </p>
            {error && (
              <p role="alert" className="text-red text-sm">
                {error}
              </p>
            )}
            <button
              className="btn btn-primary w-full"
              disabled={!ready || busy}
            >
              {busy ? "Updating…" : "Update password"}
            </button>
            <Link className="text-sm underline" href="/login">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
