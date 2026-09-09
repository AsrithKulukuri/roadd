"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  FolderOpen,
  Calendar,
  Sparkles,
  MessageSquare,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Flame,
  ArrowUpRight,
  ExternalLink,
  Menu,
  X,
  Plus,
  SlidersHorizontal,
  Bell,
  Award
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useBuilderStore, BuilderProfile } from "@/stores/builder-store";
import { useSchedulesStore } from "@/stores/schedules-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    builders, 
    currentBuilderId, 
    setCurrentBuilderId, 
    logoutBuilder, 
    getCurrentBuilder, 
    fetchFromSupabase, 
    requests 
  } = useBuilderStore();
  const { schedules, fetchSchedules } = useSchedulesStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(pathname !== "/builder/login");
  const currentBuilder = getCurrentBuilder();

  useEffect(() => {
    setMounted(true);
    fetchFromSupabase();
    fetchSchedules();

    // Authenticate builder session
    if (pathname !== "/builder/login") {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("road_builder_user");
        if (!stored) {
          setIsAuthChecking(false);
          router.replace("/builder/login");
          return;
        }
        try {
          const parsed = JSON.parse(stored);
          const targetId = parsed?.builderId || parsed?.id;
          if (!targetId) {
            setIsAuthChecking(false);
            router.replace("/builder/login");
            return;
          }
          if (targetId !== currentBuilderId) {
            setCurrentBuilderId(targetId);
          }
          setIsAuthChecking(false);
        } catch {
          setIsAuthChecking(false);
          router.replace("/builder/login");
          return;
        }
      }
    } else {
      setIsAuthChecking(false);
    }
  }, [fetchFromSupabase, fetchSchedules, pathname, router, currentBuilderId, setCurrentBuilderId]);

  // If on builder login page, render full screen without layout shell
  if (pathname === "/builder/login") {
    return <>{children}</>;
  }

  // Before mounting on client, show quick loader
  if (!mounted || isAuthChecking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
            <Building2 className="w-6 h-6 text-amber-400" />
          </div>
          <p className="text-xs text-zinc-400">Loading Builder Portal...</p>
        </div>
      </div>
    );
  }

  // If no builder is authenticated, route to builder login
  if (!currentBuilder) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-amber-400" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white tracking-tight">Builder Authentication Required</h3>
            <p className="text-xs text-zinc-400">
              Please sign in with your developer partner credentials to access your assigned projects.
            </p>
          </div>
          <div className="pt-2">
            <Button
              onClick={() => {
                logoutBuilder();
                router.replace("/builder/login");
              }}
              className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs"
            >
              Sign In to Builder Portal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSignOut = () => {
    logoutBuilder();
    toast.success("Signed out of Builder Portal");
    router.replace("/builder/login");
  };

  // Calculate synchronized upcoming schedules for this builder's projects
  const assignedSchedulesCount = schedules.filter((s) => {
    if (!currentBuilder?.assignedProjectIds) return false;
    return currentBuilder.assignedProjectIds.some(
      (pid) => pid === s.projectId || s.projectId.includes(pid) || pid.includes(s.projectId)
    );
  }).filter((s) => s.status === "scheduled").length;

  // Pending requests count for this builder
  const myPendingRequests = requests.filter(
    (r) => r.builderId === currentBuilder?.id && (r.status === "pending" || r.status === "under_review")
  ).length;

  const navLinks = [
    { href: "/builder", label: "Overview", icon: Building2 },
    { href: "/builder/projects", label: "My Projects & Analysis", icon: FolderOpen },
    {
      href: "/builder/schedules",
      label: "Site Visit Schedules",
      icon: Calendar,
      badge: assignedSchedulesCount > 0 ? assignedSchedulesCount : undefined,
    },
    {
      href: "/builder/requests",
      label: "Concierge & Requests",
      icon: Sparkles,
      badge: myPendingRequests > 0 ? myPendingRequests : undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* TOP LUXURY BUILDER NAV */}
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Logo size="sm" href="/builder" />
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                  Builder Portal <Award className="h-3 w-3" />
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">Enterprise Console</span>
              </div>
            </div>

            {/* AUTHENTICATED BUILDER PROFILE */}
            {currentBuilder && (
              <div className="hidden md:flex items-center gap-2 pl-4 border-l border-border/40">
                <span className="text-xs font-bold text-foreground">
                  {currentBuilder.companyName}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {currentBuilder.tier}
                </span>
                {currentBuilder.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="h-3 w-3" /> RERA Verified
                  </span>
                )}
              </div>
            )}
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-3">
            <Link
              href="/builder/requests"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Req Admin Concierge
            </Link>

            <button
              onClick={handleSignOut}
              title="Sign Out of Builder Portal"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>

            <ThemeToggle />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* NAVIGATION BAR TABS */}
        <div className="hidden md:block border-t border-border/30 bg-muted/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2",
                    isActive
                      ? "border-amber-500 text-amber-500 bg-amber-500/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {link.label}
                  {link.badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-zinc-950">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* MOBILE DROPDOWN */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border/40 bg-card p-4 space-y-3">
            {currentBuilder && (
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div>
                  <span className="text-xs font-bold text-foreground block">{currentBuilder.companyName}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{currentBuilder.tier} Developer</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg border border-rose-500/20"
                >
                  Sign Out
                </button>
              </div>
            )}

            <div className="space-y-1 pt-2 border-t border-border/40">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                      isActive
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </div>
                    {link.badge !== undefined && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-zinc-950">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ROAD Facing Enterprise Partner Network • Vijayawada & Amaravati</span>
          <span>Logged in as {currentBuilder?.companyName || "Developer"}</span>
        </div>
      </footer>
    </div>
  );
}
