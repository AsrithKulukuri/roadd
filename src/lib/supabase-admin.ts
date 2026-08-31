import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dns from "node:dns";

// Configure standard Node DNS resolution order (IPv4 first) without custom socket wrappers
if (typeof dns?.setDefaultResultOrder === "function") {
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    // Ignore in non-node/browser environments
  }
}

/**
 * Server-Only Supabase Admin Client Factory
 * Strictly requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.
 * NEVER falls back to the anonymous key or placeholders.
 * Uses native standard fetch.
 * 
 * CRITICAL SECURITY: Never import or expose this file on the client side!
 */

let cachedAdminClient: SupabaseClient | null = null;

function sanitizeEnvValue(val?: string): string {
  if (!val) return "";
  const cleaned = val.trim().replace(/^["']|["']$/g, "").trim();
  if (
    cleaned.toLowerCase().includes("placeholder") ||
    cleaned.toLowerCase().includes("your_key") ||
    cleaned.toLowerCase().startsWith("xxx")
  ) {
    return "";
  }
  return cleaned;
}

export function isServiceRoleConfigured(): boolean {
  const serviceKey = sanitizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const url = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return Boolean(serviceKey && url);
}

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const supabaseUrl = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseServiceKey = sanitizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl) {
    throw new Error(
      "Missing required server configuration: NEXT_PUBLIC_SUPABASE_URL is not defined."
    );
  }

  if (!supabaseServiceKey) {
    throw new Error(
      "Missing required server configuration: SUPABASE_SERVICE_ROLE_KEY is not defined. Admin operations require the service-role key."
    );
  }

  cachedAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
}

/**
 * Lazy proxy allowing seamless `import { supabaseAdmin } from "@/lib/supabase-admin"`
 * while deferring initialization until the first method call, preventing build-time failures.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop: keyof SupabaseClient) {
    const client = getSupabaseAdmin();
    const value = client[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
