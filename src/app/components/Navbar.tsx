"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

const DynamicNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`
        fixed w-full top-0 z-50
        transition-all duration-300
        flex items-center
        ${
          isScrolled
            ? "bg-[#212121]/80 h-14 shadow-md backdrop-blur-sm"
            : "bg-transparent h-30"
        }
      `}
    >
      <div className="container mx-auto px-6 flex justify-between items-center h-full">
        {/* Logo: route to the top of the homepage */}
        <Link
          href="/#home"
          className="text-2xl font-bold text-[var(--accent)]"
        >
          YourLogo
        </Link>

        {/* Navigation Links */}
        <div className="space-x-8">
          <Link
            href="/#home"
            className="text-gray-100 hover:text-[var(--accent)] transition duration-200"
          >
            Home
          </Link>
          <Link
            href="/#features"
            className="text-gray-100 hover:text-[var(--accent)] transition duration-200"
          >
            Features
          </Link>
          <Link
            href="/#pricing"
            className="text-gray-100 hover:text-[var(--accent)] transition duration-200"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="text-gray-100 hover:text-[var(--accent)] transition duration-200"
          >
            Login/Signup
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default DynamicNavbar;
