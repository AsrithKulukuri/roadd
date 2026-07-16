"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building,
  Heart,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="flex min-h-screen bg-bg-primary pt-[72px]">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 pt-[72px] z-40 bg-bg-card border-r border-border-default overflow-y-auto">
        <div className="p-6">
          <Button variant="amber" className="w-full justify-start shadow-amber-glow" asChild>
            <Link href="/dashboard/listings/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Post Property
            </Link>
          </Button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-amber-primary/10 text-amber-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-amber-primary" : "text-text-tertiary")} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-border-default/50">
          <button className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-error hover:bg-error/10 transition-colors">
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
