"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building,
  Heart,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  PlusCircle,
  Lock,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { logoutUser } from "@/hooks/use-auth-session";

const sidebarLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/listings", label: "My Properties", icon: Building },
  { href: "/dashboard/saved", label: "Saved Properties", icon: Heart },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const u = session.user;
            setUser({
              email: u.email || "",
              role: u.user_metadata?.role || "buyer",
              name: u.user_metadata?.full_name || u.user_metadata?.name || "User",
              isProfileComplete: true,
            });
            return;
          }
        } catch (e) {
          console.error("Error loading layout user session:", e);
        }
      }
      
      const stored = localStorage.getItem("road_user");
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {}
      }
    };
    
    checkUser();

    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const u = session.user;
          setUser({
            email: u.email || "",
            role: u.user_metadata?.role || "buyer",
            name: u.user_metadata?.full_name || u.user_metadata?.name || "User",
            isProfileComplete: true,
          });
        } else {
          setUser(null);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSignOut = async () => {
    await logoutUser();
    toast.success("Signed out successfully");
    window.location.href = "/login";
  };

  const isProfileIncomplete = user && !user.isProfileComplete && user.role !== "admin";
  const isAdminUser = user?.role === "admin" || user?.email === "admin@road.com";

  const displayedLinks = [...sidebarLinks];
  if (isAdminUser) {
    displayedLinks.push({ href: "/admin/users", label: "Admin Portal", icon: Shield });
  }

  return (
    <div className="flex min-h-screen bg-bg-primary pt-[72px]">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 pt-[72px] z-40 bg-bg-card border-r border-border-default overflow-y-auto">
        <div className="p-6">
          <Button 
            variant="amber" 
            className="w-full justify-between shadow-amber-glow opacity-85 cursor-not-allowed bg-amber-500/80 hover:bg-amber-500/80" 
            onClick={(e) => {
              e.preventDefault();
              toast.error("Post Property is currently locked", {
                description: "Property posting is locked by Admin at present.",
              });
            }}
          >
            <span className="flex items-center gap-2 font-extrabold">
              <PlusCircle className="h-4 w-4" />
              Post Property
            </span>
            <Lock className="h-4 w-4 text-slate-950 font-black shrink-0" />
          </Button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {displayedLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            const isMyPropertiesLocked = link.href === "/dashboard/listings";
            const isLinkDisabled = (isProfileIncomplete && link.href !== "/dashboard") || isMyPropertiesLocked;
            
            return (
              <Link
                key={link.href}
                href={isLinkDisabled ? "#" : link.href}
                onClick={(e) => {
                  if (isMyPropertiesLocked) {
                    e.preventDefault();
                    toast.error("My Properties is currently locked", {
                      description: "My Properties section is locked by Admin at present.",
                    });
                    return;
                  }
                  if (isProfileIncomplete) {
                    e.preventDefault();
                    toast.error("Please complete your profile configuration first!", {
                      description: "Other sections of the dashboard are locked until profile setup is complete.",
                    });
                  }
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group",
                  isActive
                    ? "bg-amber-primary/10 text-amber-primary"
                    : isLinkDisabled
                    ? "text-text-tertiary opacity-60 cursor-not-allowed"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-amber-primary" : "text-text-tertiary")} />
                <span className="flex-1">{link.label}</span>
                {isMyPropertiesLocked ? (
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                ) : isProfileIncomplete ? (
                  <Lock className="w-3.5 h-3.5 ml-auto text-text-tertiary opacity-60" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-border-default/50">
          <button 
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-error hover:bg-error/10 transition-colors cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-6 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
