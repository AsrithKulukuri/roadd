import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface UserRoleInfo {
  isAdmin: boolean;
  role: string;
  user: any;
  source: string;
}

/**
 * Robustly verifies whether a given user or active session has Admin privileges.
 * Checks:
 * 1. Supabase auth user_metadata.role === "admin"
 * 2. Supabase profiles table role === "admin"
 * 3. Fallback email heuristics (admin@road.com or email containing 'admin')
 * 4. Local storage session fallback
 */
export async function verifyAdminSession(): Promise<UserRoleInfo> {

  // 1. Check Supabase Auth
  if (isSupabaseConfigured()) {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();


      if (session?.user) {
        const u = session.user;
        const metaRole = u.user_metadata?.role;
        const email = (u.email || "").toLowerCase();


        // Check metadata role
        if (metaRole === "admin" || email === "admin@road.com" || email.startsWith("admin@")) {
          return {
            isAdmin: true,
            role: "admin",
            user: u,
            source: "supabase_metadata",
          };
        }

        // Query profiles table for database role confirmation
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", u.id)
            .maybeSingle();


          if (profile && profile.role === "admin") {
            return {
              isAdmin: true,
              role: "admin",
              user: u,
              source: "supabase_profiles_table",
            };
          }
        } catch (dbErr) {
          console.warn("[AUTH DEBUG] Profiles table query warning:", dbErr);
        }
      }
    } catch (err) {
      console.error("[AUTH DEBUG] Error checking Supabase session:", err);
    }
  }

  // 2. Check Local Storage session
  if (typeof window !== "undefined") {
    try {
      const adminStored = localStorage.getItem("road_admin_user");
      if (adminStored) {
        const parsedAdmin = JSON.parse(adminStored);
        return {
          isAdmin: true,
          role: "admin",
          user: parsedAdmin,
          source: "road_admin_user",
        };
      }

      const stored = localStorage.getItem("road_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role === "admin" || (parsed.email && (parsed.email.toLowerCase() === "admin@road.com" || parsed.email.toLowerCase().startsWith("admin@")))) {
          return {
            isAdmin: true,
            role: "admin",
            user: parsed,
            source: "local_storage",
          };
        }
      }
    } catch (e) {
      console.error("[AUTH DEBUG] Local storage parse error:", e);
    }
  }

  return {
    isAdmin: false,
    role: "guest",
    user: null,
    source: "unauthenticated",
  };
}
