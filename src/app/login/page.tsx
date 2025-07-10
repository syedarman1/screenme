"use client";

import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Login flow
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
        } else {
          // Navigate to /dashboard
          router.push("/dashboard");
        }
      } else {
        // Signup flow
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message);
        } else {
          // Navigate to /dashboard
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use environment variable for redirect URL, fallback to localhost for development
      const baseUrl =
        process.env.NEXT_PUBLIC_URL ||
        (typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:3000");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${baseUrl}/dashboard`,
        },
      });

      if (error) {
        setError(error.message);
      }
      // Note: If successful, user will be redirected, so no need to handle success case
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#2a2a2a] rounded-md p-6">
        <div className="flex justify-center mb-6">
          {/* Toggle Buttons */}
          <button
            onClick={() => setIsLogin(true)}
            className={`px-4 py-2 mr-2 rounded-md ${
              isLogin ? "bg-gray-500" : "bg-black-900"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`px-4 py-2 rounded-md ${
              !isLogin ? "bg-gray-500" : "bg-black-900"
            }`}
          >
            Sign Up
          </button>
        </div>

        <h2 className="text-xl font-semibold mb-6 text-center">
          {isLogin ? "Welcome Back" : "Create an Account"}
        </h2>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Email / Password Fields */}
        <div className="space-y-3 mb-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full bg-[#3a3a3a] text-white placeholder-gray-400 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null); // Clear error when user starts typing
            }}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full bg-[#3a3a3a] text-white placeholder-gray-400 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null); // Clear error when user starts typing
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[var(--accent)] text-black font-semibold py-3 rounded-lg hover:opacity-90 transition duration-200 mb-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </>
          ) : isLogin ? (
            "Login"
          ) : (
            "Sign Up"
          )}
        </button>

        <button
          onClick={handleGoogleOAuth}
          disabled={loading}
          className="w-full bg-[var(--accent)] text-black font-semibold py-3 rounded-lg hover:opacity-90 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </>
          ) : isLogin ? (
            "Login with Google"
          ) : (
            "Sign Up with Google"
          )}
        </button>
      </div>
    </div>
  );
}
