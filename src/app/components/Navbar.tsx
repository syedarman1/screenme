"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useRouter, usePathname } from "next/navigation";
import { type User } from "@supabase/supabase-js";

const NAV_LINKS = [
  { href: "/#features",  label: "Features"  },
  { href: "/#pricing",   label: "Pricing"   },
  { href: "/contact",    label: "Contact"   },
];

export default function DynamicNavbar() {
  const [scrolled,    setScrolled]    = useState(false);
  const [user,        setUser]        = useState<User | null>(null);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, session) => setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      {/* ── Bar ── */}
      <nav
        aria-label="Main navigation"
        className={`
          fixed top-0 inset-x-0 z-50
          transition-all duration-300
          ${scrolled
            ? "h-12 bg-white/80 backdrop-blur-2xl border-b border-black/[0.08] shadow-sm"
            : "h-16 bg-transparent"
          }
        `}
      >
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">

          {/* Wordmark */}
          <Link
            href="/"
            className="text-[#1d1d1f] font-semibold text-lg tracking-tight hover:text-[#0071e3] transition-colors duration-200"
            aria-label="ScreenMe home"
          >
            Screen<span className="text-[#0071e3]">Me</span>
          </Link>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="text-sm font-medium text-[#6e6e73] hover:text-[#1d1d1f] transition-colors duration-200"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative group">
                <button
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/[0.08] bg-white hover:border-black/[0.14] hover:shadow-sm transition-all duration-200 cursor-pointer"
                  aria-haspopup="true"
                >
                  <div className="w-6 h-6 rounded-full bg-[#0071e3] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-[#1d1d1f] max-w-[96px] truncate">
                    {user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0]}
                  </span>
                  <svg className="w-3 h-3 text-[#86868b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-black/[0.08] rounded-2xl shadow-lg py-1.5 z-50
                                opacity-0 pointer-events-none translate-y-1
                                group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0
                                transition-all duration-200 ease-out">
                  <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors rounded-xl mx-1">
                    <svg className="w-4 h-4 text-[#0071e3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Dashboard
                  </Link>
                  <div className="my-1 mx-3 border-t border-black/[0.06]" />
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#ff3b30] hover:bg-[#f5f5f7] transition-colors rounded-xl mx-1 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-[#6e6e73] hover:text-[#1d1d1f] transition-colors duration-200 px-3 py-1.5"
                >
                  Sign in
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-semibold px-5 py-2 rounded-full bg-[#0071e3] text-white hover:bg-[#0077ed] transition-colors duration-200 cursor-pointer shadow-sm"
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px] cursor-pointer"
            onClick={() => setMobileOpen(v => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <span className={`block w-5 h-[1.5px] bg-[#1d1d1f] transition-all duration-300 origin-center ${mobileOpen ? "rotate-45 translate-y-[6.5px]" : ""}`} />
            <span className={`block w-5 h-[1.5px] bg-[#1d1d1f] transition-all duration-300 ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
            <span className={`block w-5 h-[1.5px] bg-[#1d1d1f] transition-all duration-300 origin-center ${mobileOpen ? "-rotate-45 -translate-y-[6.5px]" : ""}`} />
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      <div className={`fixed inset-0 z-40 md:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileOpen(false)}
        />
        {/* Panel */}
        <div className={`absolute right-0 top-0 h-full w-72 bg-white border-l border-black/[0.08]
          flex flex-col pt-20 pb-10 px-5 shadow-2xl
          transform transition-transform duration-300 ease-out
          ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          {user && (
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-black/[0.06]">
              <div className="w-10 h-10 rounded-full bg-[#0071e3] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-[#1d1d1f] truncate">
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                </p>
                <p className="text-xs text-[#86868b] truncate">{user.email}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1 flex-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={label} href={href}
                className="text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] px-3 py-3 rounded-xl text-sm font-medium transition-colors"
              >{label}</Link>
            ))}
            {user ? (
              <>
                <Link href="/dashboard"
                  className="text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] px-3 py-3 rounded-xl text-sm font-medium transition-colors"
                >Dashboard</Link>
                <div className="flex-1" />
                <button onClick={handleSignOut}
                  className="text-left text-[#ff3b30] hover:bg-[#f5f5f7] px-3 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >Sign out</button>
              </>
            ) : (
              <div className="mt-6 flex flex-col gap-2.5">
                <Link href="/login"
                  className="text-center px-4 py-2.5 rounded-xl border border-black/[0.10] text-[#1d1d1f] text-sm font-medium hover:bg-[#f5f5f7] transition-colors"
                >Sign in</Link>
                <Link href="/login"
                  className="text-center px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-sm font-semibold hover:bg-[#0077ed] transition-colors"
                >Get started</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
