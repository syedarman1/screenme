"use client";

import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient"; 
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    if (isLogin) {
      // Login flow
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
      } else {
        // Navigate to /dashboard
        router.push("/dashboard");
      }
    } else {
      // Signup flow
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
      } else {
        // Navigate to /dashboard
        router.push("/dashboard");
      }
    }
  };

  const handleGoogleOAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Change to your domain in production
        redirectTo: "http://localhost:3000/dashboard",
      },
    });
    if (error) {
      alert(error.message);
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

        {/* Email / Password Fields */}
        <div className="space-y-3 mb-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full bg-[#3a3a3a] text-white placeholder-gray-400 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full bg-[#3a3a3a] text-white placeholder-gray-400 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full bg-[var(--accent)] text-black font-semibold py-3 rounded-lg hover:opacity-90 transition duration-200 mb-4"
        >
          {isLogin ? "Login" : "Sign Up"}
        </button>

        <button
          onClick={handleGoogleOAuth}
          className="w-full bg-[var(--accent)] text-black font-semibold py-3 rounded-lg hover:opacity-90 transition duration-200"
        >
          {isLogin ? "Login with Google" : "Sign Up with Google"}
        </button>
      </div>
    </div>
  );
}
