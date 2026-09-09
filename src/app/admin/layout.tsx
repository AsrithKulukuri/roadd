"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/shared/logo";

import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X,
  FolderOpen,
  Image as ImageIcon,
  LayoutGrid,
  MessageSquare,
  MapPin,
  LayoutList,
  Send,
  Bot,
  Calendar,
  ExternalLink,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useInquiriesStore } from "@/stores/inquiries-store";
import { useSchedulesStore } from "@/stores/schedules-store";
import { AdminGuard } from "@/components/shared/admin-guard";

const sidebarLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/schedules", label: "Site Visit Schedules", icon: Calendar, isScheduleBadge: true },
  { href: "/admin/support", label: "WhatsApp Support Desk", icon: Bot },
  { href: "/admin/broadcasts", label: "WhatsApp Broadcasts", icon: Send },
  { href: "/admin/inquiries", label: "Requirements & Leads", icon: MessageSquare, isBadge: true },
  { href: "/admin/properties", label: "Properties", icon: Building2 },
  { href: "/admin/projects", label: "Projects", icon: FolderOpen },
  { href: "/admin/builders", label: "Builders & Portals", icon: Briefcase },
  { href: "/admin/locations", label: "Locations & Localities", icon: MapPin },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/content", label: "Categories & Content", icon: LayoutGrid },
  { href: "/admin/homepage", label: "Homepage Shelves", icon: LayoutList },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const getAdminPageInfo = (path: string) => {
  if (path === "/admin" || path === "/admin/dashboard") {
    return { title: "Dashboard", badge: "Live Ops", icon: LayoutDashboard };
  }
  if (path === "/admin/properties/new") {
    return { title: "New Property", badge: "Add", icon: Building2 };
  }
  if (path.includes("/admin/properties/") && path.includes("/edit")) {
    return { title: "Edit Property", badge: "Modify", icon: Building2 };
  }
  if (path.startsWith("/admin/properties")) {
    return { title: "Properties", badge: "Listings", icon: Building2 };
  }
  if (path === "/admin/projects/new") {
    return { title: "New Project", badge: "Add", icon: FolderOpen };
  }
  if (path.includes("/admin/projects/") && path.includes("/edit")) {
    return { title: "Edit Project", badge: "Modify", icon: FolderOpen };
  }
  if (path.startsWith("/admin/projects")) {
    return { title: "Projects", badge: "Ventures", icon: FolderOpen };
  }
  if (path.startsWith("/admin/builders")) {
    return { title: "Builder Partners", badge: "Enterprise", icon: Briefcase };
  }
  if (path.startsWith("/admin/schedules")) {
    return { title: "Site Visits", badge: "Schedules", icon: Calendar };
  }
  if (path.startsWith("/admin/inquiries")) {
    return { title: "Buyer Inquiries", badge: "Leads", icon: MessageSquare };
  }
  if (path.startsWith("/admin/support")) {
    return { title: "Support Desk", badge: "WhatsApp", icon: Bot };
  }
  if (path.startsWith("/admin/broadcasts")) {
    return { title: "Broadcasts", badge: "Marketing", icon: Send };
  }
  if (path.startsWith("/admin/locations")) {
    return { title: "Locations", badge: "Localities", icon: MapPin };
  }
  if (path.startsWith("/admin/banners")) {
    return { title: "Banners", badge: "Hero Ads", icon: ImageIcon };
  }
  if (path.startsWith("/admin/users")) {
    return { title: "Admin Users", badge: "Access", icon: Users };
  }
  if (path.startsWith("/admin/content")) {
    return { title: "Content", badge: "Categories", icon: LayoutGrid };
  }
  if (path.startsWith("/admin/homepage")) {
    return { title: "Homepage", badge: "Shelves", icon: LayoutList };
  }
  if (path.startsWith("/admin/settings")) {
    return { title: "Settings", badge: "System", icon: Settings };
  }
  return { title: "Admin Portal", badge: "Manager", icon: LayoutDashboard };
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const unreadCount = useInquiriesStore((s) => s.getUnreadCount());
  const upcomingSchedulesCount = useSchedulesStore((s) => s.getUpcomingCount());

  useEffect(() => {
    setMounted(true);
    useSchedulesStore.getState().fetchSchedules();
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setIsMobileOpen(false);
    router.replace("/");
    router.refresh();
  };

  if (pathname === "/admin/login") {
    return <AdminGuard>{children}</AdminGuard>;
  }

  const isFormPage = pathname.endsWith("/new") || pathname.includes("/edit");
  const pageInfo = getAdminPageInfo(pathname);

  return (
    <AdminGuard>
      <div className="min-h-screen bg-bg-primary flex">
        {/* Mobile Sidebar Overlay */}
        {isMobileOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200" 
            onClick={() => setIsMobileOpen(false)} 
          />
        )}

        {/* Sidebar Drawer */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-bg-card border-r border-border-default transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:w-64 lg:sticky lg:top-0 lg:h-screen lg:max-h-screen flex flex-col shrink-0 shadow-2xl lg:shadow-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {/* Sidebar Top Brand Header */}
            <div className="h-16 flex items-center px-5 sm:px-6 border-b border-border-default shrink-0 justify-between">
              <Logo size="sm" />
              <button 
                type="button" 
                aria-label="Close admin navigation" 
                className="lg:hidden text-text-secondary hover:text-text-primary p-2 rounded-xl hover:bg-bg-primary transition-colors cursor-pointer" 
                onClick={() => setIsMobileOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Admin Mobile Quick Info Card */}
            <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-border-default shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                    AD
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-text-primary truncate">Admin Control</p>
                    <p className="text-[10px] text-text-tertiary truncate">Road Facing AP</p>
                  </div>
                </div>
                <Link
                  href="/"
                  target="_blank"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-primary text-[11px] font-semibold transition-colors shrink-0"
                >
                  <span>Live Site</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Sidebar Navigation Links */}
            <nav className="flex-1 min-h-0 px-3 py-3 space-y-1 overflow-y-auto overscroll-contain focus:outline-none scrollbar-thin">
              {sidebarLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3.5 py-3 lg:py-2.5 rounded-xl transition-all font-medium text-sm group min-h-[44px]",
                      isActive
                        ? "bg-amber-primary/10 text-amber-primary font-semibold shadow-xs"
                        : "text-text-secondary hover:bg-bg-primary hover:text-text-primary"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={cn("w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-amber-primary" : "text-text-tertiary group-hover:text-text-primary")} />
                      <span className="truncate">{link.label}</span>
                    </div>
                    {link.isBadge && mounted && unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 shadow-xs shrink-0">
                        {unreadCount}
                      </span>
                    )}
                    {link.isScheduleBadge && mounted && upcomingSchedulesCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-xs shrink-0">
                        {upcomingSchedulesCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Sidebar Footer Sign Out */}
            <div className="p-3.5 border-t border-border-default shrink-0 bg-bg-card">
              <button
                type="button"
                onClick={() => void signOut()}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-medium text-sm cursor-pointer"
              >
                <LogOut className="w-4.5 h-4.5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Mobile & Desktop Top Header */}
          <header className="h-16 bg-bg-card border-b border-border-default shrink-0 flex items-center justify-between px-3.5 sm:px-6 lg:px-10 sticky top-0 z-30">
            <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
              <button 
                type="button"
                aria-label="Open navigation menu"
                className="lg:hidden p-2 -ml-1 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors cursor-pointer shrink-0"
                onClick={() => setIsMobileOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-heading text-base sm:text-lg font-bold text-text-primary truncate">
                      {pageInfo.title}
                    </h1>
                    <span className="hidden xs:inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                      {pageInfo.badge}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                href="/"
                target="_blank"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-default text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
                title="Open Public Website"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Live Site</span>
              </Link>


              <button
                type="button"
                onClick={() => setIsMobileOpen(true)}
                className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-xs cursor-pointer select-none lg:pointer-events-none"
                title="Admin Control"
              >
                AD
              </button>
            </div>
          </header>

          {/* Page Content with Safe Bottom Margin for Mobile Bottom Nav */}
          <div className={cn("flex-1 overflow-auto", !isFormPage ? "pb-20 lg:pb-0" : "pb-24")}>
            {children}
          </div>

          {/* Mobile Bottom Navigation Dock (lg:hidden, hidden on creation/edit forms so save panel is unobstructed) */}
          {!isFormPage && (
            <nav 
              aria-label="Mobile Bottom Navigation"
              className="fixed bottom-0 left-0 right-0 z-30 bg-bg-card/95 backdrop-blur-xl border-t border-border-default lg:hidden shadow-xl pb-[max(0px,env(safe-area-inset-bottom))]"
            >
              <div className="grid grid-cols-5 h-16 items-center px-1 max-w-md mx-auto">
                {/* 1. Dashboard */}
                <Link
                  href="/admin/dashboard"
                  className={cn(
                    "flex flex-col items-center justify-center h-full py-1 gap-1 text-[10px] font-bold transition-all relative",
                    (pathname === "/admin" || pathname === "/admin/dashboard")
                      ? "text-amber-500 font-black"
                      : "text-text-tertiary hover:text-text-primary"
                  )}
                >
                  {(pathname === "/admin" || pathname === "/admin/dashboard") && (
                    <span className="absolute top-1 w-8 h-1 bg-amber-500 rounded-full" />
                  )}
                  <LayoutDashboard className="w-5 h-5 shrink-0" />
                  <span className="truncate">Home</span>
                </Link>

                {/* 2. Properties */}
                <Link
                  href="/admin/properties"
                  className={cn(
                    "flex flex-col items-center justify-center h-full py-1 gap-1 text-[10px] font-bold transition-all relative",
                    (pathname.startsWith("/admin/properties"))
                      ? "text-amber-500 font-black"
                      : "text-text-tertiary hover:text-text-primary"
                  )}
                >
                  {pathname.startsWith("/admin/properties") && (
                    <span className="absolute top-1 w-8 h-1 bg-amber-500 rounded-full" />
                  )}
                  <Building2 className="w-5 h-5 shrink-0" />
                  <span className="truncate">Properties</span>
                </Link>

                {/* 3. Projects */}
                <Link
                  href="/admin/projects"
                  className={cn(
                    "flex flex-col items-center justify-center h-full py-1 gap-1 text-[10px] font-bold transition-all relative",
                    (pathname.startsWith("/admin/projects"))
                      ? "text-amber-500 font-black"
                      : "text-text-tertiary hover:text-text-primary"
                  )}
                >
                  {pathname.startsWith("/admin/projects") && (
                    <span className="absolute top-1 w-8 h-1 bg-amber-500 rounded-full" />
                  )}
                  <FolderOpen className="w-5 h-5 shrink-0" />
                  <span className="truncate">Projects</span>
                </Link>

                {/* 4. Inquiries */}
                <Link
                  href="/admin/inquiries"
                  className={cn(
                    "flex flex-col items-center justify-center h-full py-1 gap-1 text-[10px] font-bold transition-all relative",
                    (pathname.startsWith("/admin/inquiries"))
                      ? "text-amber-500 font-black"
                      : "text-text-tertiary hover:text-text-primary"
                  )}
                >
                  {pathname.startsWith("/admin/inquiries") && (
                    <span className="absolute top-1 w-8 h-1 bg-amber-500 rounded-full" />
                  )}
                  <div className="relative">
                    <MessageSquare className="w-5 h-5 shrink-0" />
                    {mounted && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 shadow-xs">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="truncate">Inquiries</span>
                </Link>

                {/* 5. More (Drawer Trigger) */}
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(true)}
                  className={cn(
                    "flex flex-col items-center justify-center h-full py-1 gap-1 text-[10px] font-bold transition-all relative cursor-pointer",
                    isMobileOpen || (!pathname.startsWith("/admin/properties") && !pathname.startsWith("/admin/projects") && !pathname.startsWith("/admin/inquiries") && pathname !== "/admin" && pathname !== "/admin/dashboard")
                      ? "text-amber-500 font-black"
                      : "text-text-tertiary hover:text-text-primary"
                  )}
                >
                  {(isMobileOpen || (!pathname.startsWith("/admin/properties") && !pathname.startsWith("/admin/projects") && !pathname.startsWith("/admin/inquiries") && pathname !== "/admin" && pathname !== "/admin/dashboard")) && (
                    <span className="absolute top-1 w-8 h-1 bg-amber-500 rounded-full" />
                  )}
                  <div className="relative">
                    <Menu className="w-5 h-5 shrink-0" />
                    {mounted && upcomingSchedulesCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-bg-card" />
                    )}
                  </div>
                  <span className="truncate">More</span>
                </button>
              </div>
            </nav>
          )}
        </main>
      </div>
    </AdminGuard>
  );
}

