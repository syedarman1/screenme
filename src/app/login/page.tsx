"use client";

import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showCreateOption, setShowCreateOption] = useState(false);
  const router = useRouter();

  const handleCreateAccount = async () => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage(
          "Account created! Please check your email to verify your account."
        );
        setShowCreateOption(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // First try to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // If email not confirmed
        if (signInError.message.includes("Email not confirmed")) {
          setError("Please check your email and click the confirmation link.");
          return;
        }

        // For invalid credentials, show option to create account
        if (signInError.message.includes("Invalid login credentials")) {
          setError(
            "Invalid email or password. Please check your credentials and try again."
          );
          setShowCreateOption(true);
          return;
        }

        setError(signInError.message);
      } else {
        // Successful sign in
        router.push("/dashboard");
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
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-light text-white">
            Welcome to ScreenMe
          </h2>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a]">
          {/* Google OAuth Button - Primary */}
          <button
            onClick={handleGoogleOAuth}
            disabled={loading}
            className="w-full bg-white text-gray-900 font-medium py-3 rounded-lg hover:bg-gray-100 
                     transition duration-200 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading && <span className="animate-spin">⟳</span>}
            Continue with Google
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2a2a2a]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#1a1a1a] text-gray-500">
                or continue with email
              </span>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-900/50 rounded-lg">
              <p className="text-green-400 text-sm">{message}</p>
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleAuth} className="space-y-3">
            <input
              type="email"
              placeholder="Email address"
              className="w-full bg-[#0a0a0a] text-white placeholder-gray-500 p-3 rounded-lg 
                       border border-[#2a2a2a] focus:outline-none focus:border-[var(--accent)] 
                       transition-colors"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
                if (message) setMessage(null);
                if (showCreateOption) setShowCreateOption(false);
              }}
              required
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              className="w-full bg-[#0a0a0a] text-white placeholder-gray-500 p-3 rounded-lg 
                       border border-[#2a2a2a] focus:outline-none focus:border-[var(--accent)] 
                       transition-colors"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
                if (message) setMessage(null);
                if (showCreateOption) setShowCreateOption(false);
              }}
              minLength={6}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent)] text-black font-semibold py-3 rounded-lg 
                       hover:bg-[#e6b800] transition duration-200 disabled:opacity-50 
                       disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                "Continue"
              )}
            </button>
          </form>

          {/* Create Account Option - Only show when login fails */}
          {showCreateOption && (
            <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
              <p className="text-center text-gray-400 text-sm mb-3">
                Don't have an account yet?
              </p>
              <button
                onClick={handleCreateAccount}
                disabled={loading}
                className="w-full bg-[var(--accent)] text-black font-semibold py-3 rounded-lg 
                          hover:bg-[#e6b800] transition duration-200 disabled:opacity-50 
                          disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  "Create New Account"
                )}
              </button>
            </div>
          )}

          <p className="text-center text-gray-500 text-xs mt-6">
            New users will receive a verification email
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-gray-600 text-xs">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
          <a
            href="#"
            className="text-gray-500 text-xs hover:text-gray-400 transition"
          >
            Having trouble? Contact support
          </a>
        </div>
      </div>
    </div>
  );
}
