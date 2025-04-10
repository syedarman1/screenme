// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Get the Supabase URL and anon key from your environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single supabase client for interacting with your database 
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
