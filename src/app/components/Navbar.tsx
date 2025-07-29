"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient"; // Adjust path if needed
import { useRouter } from "next/navigation";

const DynamicNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);

  const router = useRouter();

  // Change navbar background on scroll
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

  // Fetch current user from Supabase on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });
  }, []);

  // Sign out logic
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

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
        {/* Updated Logo using an image */}
        <Link href="/#home" className="pt-2">
          <img src="/logo.png" alt="ScreenMe Logo" className="h-36 auto" />
        </Link>

        {/* Navigation Links and Right Section */}
        <div className="space-x-8 flex items-center">
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
          {user ? (
            // If user is signed in, display their profile picture with a hover dropdown
            <div className="relative group">
              <img
                src={user.user_metadata?.avatar_url || "/pfp-placeholder.png"}
                alt="Profile"
                className="w-10 h-10 rounded-full cursor-pointer"
              />
              <div className="absolute right-0 mt-2 w-36 bg-[#2a2a2a] rounded-md shadow-lg py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-sm text-white hover:bg-gray-800"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-gray-100 hover:text-[var(--accent)] transition duration-200"
            >
              Login/Signup
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default DynamicNavbar;
