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

const sidebarLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/listings", label: "My Properties", icon: Building },
  { href: "/dashboard/saved", label: "Saved Properties", icon: Heart },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
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
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } catch (err: any) {
        console.error("Error signing out via Supabase:", err);
      }
    }
    
    localStorage.removeItem("road_user");
    toast.success("Signed out successfully");
    router.push("/login");
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
            className={cn("w-full justify-start shadow-amber-glow", isProfileIncomplete && "opacity-40 cursor-not-allowed")} 
            onClick={(e) => {
              if (isProfileIncomplete) {
                e.preventDefault();
                toast.error("Complete your profile first!", {
                  description: "You cannot post properties until setup is complete.",
                });
              }
            }}
            asChild={!isProfileIncomplete}
          >
            {isProfileIncomplete ? (
              <span className="flex items-center">
                <PlusCircle className="mr-2 h-4 w-4" />
                Post Property
              </span>
            ) : (
              <Link href="/dashboard/listings/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Post Property
              </Link>
            )}
          </Button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {displayedLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            const isLinkDisabled = isProfileIncomplete && link.href !== "/dashboard";
            
            return (
              <Link
                key={link.href}
                href={isLinkDisabled ? "#" : link.href}
                onClick={(e) => {
                  if (isLinkDisabled) {
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
                    ? "text-text-tertiary opacity-40 cursor-not-allowed"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-amber-primary" : "text-text-tertiary")} />
                {link.label}
                {isLinkDisabled && (
                  <Lock className="w-3.5 h-3.5 ml-auto text-text-tertiary opacity-60" />
                )}
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
