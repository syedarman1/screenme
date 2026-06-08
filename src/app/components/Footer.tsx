import React from "react";
import Link from "next/link";
import Logo from "./Logo";

const LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Contact", href: "/contact" },
  { label: "Dashboard", href: "/dashboard" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-5">
        <Logo className="text-sm" />

        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {LINKS.map(({ label, href }) => (
            <Link key={label} href={href} className="text-xs text-fg-subtle hover:text-fg transition-colors">
              {label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-fg-subtle">© {new Date().getFullYear()} ScreenMe</p>
      </div>
    </footer>
  );
}
