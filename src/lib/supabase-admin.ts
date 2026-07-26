import { createClient } from "@supabase/supabase-js";

/**
 * Server-Only Supabase Admin Client
 * Uses SUPABASE_SERVICE_ROLE_KEY to perform privileged operations like
 * user creation, admin session generation, and RLS bypass for phone_otps table.
 * 
 * CRITICAL SECURITY: Never import or expose this file on the client side!
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY environment variable is not defined. Falling back to anon key. Admin operations may fail.");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
