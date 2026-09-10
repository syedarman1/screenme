"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
export default function AccountBoundary({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!supabase) {
      setOwner(null);
      return;
    }
    let active = true;
    let observed = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      observed = true;
      if (active) setOwner(session?.user.id ?? null);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (active && !observed) setOwner(data.session?.user.id ?? null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  if (!owner)
    return (
      <main className="page-shell">
        <div className="max-w-lg mx-auto px-6 py-20">
          {owner === undefined ? (
            <p>Loading your account…</p>
          ) : (
            <>
              <h1 className="text-2xl mb-4">Sign in to open your workspace.</h1>
              <Link href="/login" className="btn btn-primary">
                Sign in
              </Link>
            </>
          )}
        </div>
      </main>
    );
  // A different identity remounts the entire private view, discarding previous account state.
  return <div key={owner}>{children}</div>;
}
