"use client";

import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthPage() {
  const [email,             setEmail]             = useState("");
  const [password,          setPassword]          = useState("");
  const [showPassword,      setShowPassword]      = useState(false);
  const [error,             setError]             = useState<string | null>(null);
  const [message,           setMessage]           = useState<string | null>(null);
  const [loading,           setLoading]           = useState(false);
  const [showCreate,        setShowCreate]        = useState(false);
  const [showForgot,        setShowForgot]        = useState(false);
  const router = useRouter();

  const clear = () => { setError(null); setMessage(null); };

  const handleForgot = async () => {
    if (!email) { setError("Enter your email address above first."); return; }
    if (!supabase) return;
    setLoading(true); clear();
    try {
      const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/dashboard`,
      });
      if (e) setError(e.message);
      else { setMessage("Reset link sent — check your inbox."); setShowForgot(false); }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!email || !password) { setError("Please enter email and password."); return; }
    if (!supabase) return;
    setLoading(true); clear();
    try {
      const { error: e } = await supabase.auth.signUp({ email, password });
      if (e) setError(e.message);
      else { setMessage("Account created! Check your email to verify."); setShowCreate(false); }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please enter email and password."); return; }
    if (!supabase) return;
    setLoading(true); clear(); setShowCreate(false);
    try {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) {
        if (e.message.includes("Email not confirmed")) setError("Verify your email before signing in.");
        else if (e.message.includes("Invalid login credentials")) { setError("Invalid email or password."); setShowCreate(true); }
        else setError(e.message);
      } else router.push("/dashboard");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    if (!supabase) return;
    setLoading(true); clear();
    try {
      const { error: e } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (e) setError(e.message);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Glow */}
      <div aria-hidden className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-[#fdc806] opacity-[0.05] rounded-full blur-[100px]" />

      <div className="w-full max-w-sm relative z-10">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-xl font-semibold text-white tracking-tight">
            Screen<span className="text-[#fdc806]">Me</span>
          </Link>
          <h1 className="text-2xl font-semibold text-white mt-5 mb-1 tracking-tight">Welcome back</h1>
          <p className="text-sm text-[#52525b]">Sign in to your account</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-7 flex flex-col gap-4">
          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full bg-white text-[#0a0a0a] font-medium py-2.5 rounded-xl hover:bg-gray-100
                     transition-colors duration-200 flex items-center justify-center gap-2.5 text-sm disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-[#3f3f46]">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Alerts */}
          {error && (
            <div role="alert" className="p-3 rounded-xl border border-red-500/20 bg-red-500/8">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          {message && (
            <div role="status" className="p-3 rounded-xl border border-[#fdc806]/20 bg-[#fdc806]/8">
              <p className="text-sm text-[#fdc806]">{message}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-3" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[#71717a] mb-1.5">Email</label>
              <input
                id="email" type="email" autoComplete="email" required
                placeholder="you@example.com"
                className="w-full bg-black/50 text-white placeholder-[#3f3f46] px-3.5 py-2.5 rounded-xl
                         border border-white/[0.08] focus:outline-none focus:border-[#fdc806]/50
                         transition-colors text-sm"
                value={email}
                onChange={e => { setEmail(e.target.value); clear(); setShowCreate(false); }}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[#71717a] mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required
                  placeholder="••••••"
                  minLength={6}
                  className="w-full bg-black/50 text-white placeholder-[#3f3f46] px-3.5 py-2.5 pr-10 rounded-xl
                           border border-white/[0.08] focus:outline-none focus:border-[#fdc806]/50
                           transition-colors text-sm"
                  value={password}
                  onChange={e => { setPassword(e.target.value); clear(); setShowCreate(false); }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa] transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  }
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-[#fdc806] text-black font-semibold py-2.5 rounded-xl
                       hover:bg-[#fdd835] transition-colors duration-200 disabled:opacity-50 text-sm
                       flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {loading ? "Signing in…" : "Continue"}
            </button>
          </form>

          {/* Forgot */}
          <div className="text-right -mt-1">
            <button type="button" onClick={() => setShowForgot(v => !v)}
              className="text-xs text-[#3f3f46] hover:text-[#71717a] transition-colors cursor-pointer">
              Forgot password?
            </button>
          </div>

          {showForgot && (
            <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2">
              <p className="text-xs text-[#52525b]">Enter your email above and we'll send a reset link.</p>
              <button type="button" onClick={handleForgot} disabled={loading}
                className="w-full bg-white/[0.06] border border-white/[0.08] text-[#a1a1aa] hover:text-white hover:bg-white/[0.09]
                          font-medium py-2.5 rounded-xl transition-colors text-sm cursor-pointer disabled:opacity-50">
                {loading ? "Sending…" : "Send reset email"}
              </button>
            </div>
          )}

          {/* Create account */}
          {showCreate && (
            <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2">
              <p className="text-xs text-[#52525b] text-center">Don't have an account?</p>
              <button type="button" onClick={handleCreate} disabled={loading}
                className="w-full bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.10]
                          font-medium py-2.5 rounded-xl transition-colors text-sm cursor-pointer disabled:opacity-50">
                {loading ? "Creating…" : "Create account"}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[#27272a] text-xs mt-5">
          By continuing you agree to our{" "}
          <Link href="/contact" className="hover:text-[#52525b] transition-colors">Terms of Service</Link>
        </p>
      </div>
    </div>
  );
}
