"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useRouter, usePathname } from "next/navigation";
import { type User } from "@supabase/supabase-js";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";

const MARKETING_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

const APP_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/resume", label: "Resume" },
  { href: "/jobmatch", label: "Job Match" },
  { href: "/coverLetter", label: "Cover Letter" },
  { href: "/interview", label: "Interview" },
  { href: "/applications", label: "Applications" },
  { href: "/resumes", label: "My Resumes" },
];

const APP_ROUTES = new Set(APP_LINKS.map((l) => l.href).concat(["/tailor", "/success"]));

export default function DynamicNavbar() {
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isAppRoute = APP_ROUTES.has(pathname);

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

  const navLinks = isAppRoute && user ? APP_LINKS : MARKETING_LINKS;

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-md border-b border-border">
        <nav
          aria-label="Main navigation"
          className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between"
        >
          <Link
            href={user ? "/dashboard" : "/"}
            className="hover:opacity-80 transition-opacity duration-200"
            aria-label="ScreenMe home"
          >
            <Logo />
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={label}
                  href={href}
                  className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors duration-200 ${
                    active
                      ? "text-fg bg-surface-2"
                      : "text-fg-muted hover:text-fg hover:bg-surface-2"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-surface hover:border-border-2 transition-all duration-200 cursor-pointer"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center text-accent-fg text-xs font-semibold shrink-0">
                    {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-fg max-w-[96px] truncate">
                    {user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0]}
                  </span>
                  <svg className={`w-3 h-3 text-fg-subtle transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                )}

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-surface border border-border rounded-lg shadow-lg py-1 z-50">
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors mx-1 rounded-md"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/resumes"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors mx-1 rounded-md"
                    >
                      My Resumes
                    </Link>
                    <div className="my-1 mx-2 border-t border-border" />
                    <button
                      onClick={() => { setDropdownOpen(false); handleSignOut(); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red hover:bg-surface-2 transition-colors mx-1 rounded-md cursor-pointer"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost px-3 py-1.5 text-sm">
                  Sign in
                </Link>
                <Link href="/login" className="btn btn-primary px-4 py-2 text-sm">
                  Get started
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              className="flex flex-col justify-center items-center w-9 h-9 gap-[5px] cursor-pointer"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <span className={`block w-5 h-[1.5px] bg-fg transition-all duration-300 origin-center ${mobileOpen ? "rotate-45 translate-y-[6.5px]" : ""}`} />
              <span className={`block w-5 h-[1.5px] bg-fg transition-all duration-300 ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
              <span className={`block w-5 h-[1.5px] bg-fg transition-all duration-300 origin-center ${mobileOpen ? "-rotate-45 -translate-y-[6.5px]" : ""}`} />
            </button>
          </div>
        </nav>
      </header>

      <div className={`fixed inset-0 z-40 md:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-fg/20 transition-opacity duration-300 ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 h-full w-72 bg-surface border-l border-border
          flex flex-col pt-16 pb-10 px-4 shadow-lg
          transform transition-transform duration-300 ease-out
          ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          {user && (
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-border">
              <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center text-accent-fg font-semibold text-sm shrink-0">
                {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-fg truncate">
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                </p>
                <p className="text-xs text-fg-subtle truncate">{user.email}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-0.5 flex-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className={`px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === href
                    ? "text-fg bg-surface-2"
                    : "text-fg-muted hover:text-fg hover:bg-surface-2"
                }`}
              >
                {label}
              </Link>
            ))}
            {user ? (
              <>
                <div className="flex-1" />
                <button
                  onClick={handleSignOut}
                  className="text-left text-red hover:bg-surface-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="mt-6 flex flex-col gap-2">
                <Link href="/login" className="btn btn-secondary w-full py-2.5">
                  Sign in
                </Link>
                <Link href="/login" className="btn btn-primary w-full py-2.5">
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
