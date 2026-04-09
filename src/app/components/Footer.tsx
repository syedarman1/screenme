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
    <footer className="border-t border-black/[0.06] bg-[#f5f5f7] py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <span className="text-sm font-semibold text-[#1d1d1f]">
          Screen<span className="text-[#0071e3]">Me</span>
        </span>

        <nav className="flex flex-wrap justify-center gap-x-7 gap-y-2">
          {LINKS.map(({ label, href }) => (
            <Link key={label} href={href} className="text-xs text-[#86868b] hover:text-[#1d1d1f] transition-colors">
              {label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-[#aeaeb2]">© {new Date().getFullYear()} ScreenMe</p>
      </div>
    </footer>
  );
}
