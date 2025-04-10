"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient"; // adjust path if needed
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        // If no user found, redirect to /login
        router.push("/login");
      } else {
        setUser(data.user);
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl mb-4">Welcome to Your Dashboard</h1>
      <p className="mb-8">You are logged in as: {user?.email}</p>
      {/* Additional dashboard content here */}
    </div>
  );
}
