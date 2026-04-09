import React from "react";
import Link from "next/link";

const LINKS = [
  { label: "Features",  href: "/#features"  },
  { label: "Pricing",   href: "/#pricing"   },
  { label: "Contact",   href: "/contact"    },
  { label: "Dashboard", href: "/dashboard"  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.05] py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Wordmark */}
        <span className="text-sm font-semibold text-white">
          Screen<span className="text-[#fdc806]">Me</span>
        </span>

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-x-7 gap-y-2">
          {LINKS.map(({ label, href }) => (
            <Link key={label} href={href} className="text-xs text-[#3f3f46] hover:text-[#71717a] transition-colors">
              {label}
            </Link>
          ))}
        </nav>

        {/* Copy */}
        <p className="text-xs text-[#27272a]">© {new Date().getFullYear()} ScreenMe</p>
      </div>
    </footer>
  );
}
