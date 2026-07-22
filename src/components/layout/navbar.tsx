"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Heart,
  Bell,
  User,
  Menu,
  X,
  Home,
  Building2,
  MapPin,
  Plus,
  ChevronDown,
  LogIn,
  Megaphone,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navigationLinks } from "@/config/site";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Load user session from Supabase or localStorage
  useEffect(() => {
    const checkUser = async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const u = session.user;
            setUser({
              name: u.user_metadata?.full_name || u.user_metadata?.name || "User",
            });
            return;
          }
        } catch (e) {
          console.error("Error fetching navbar user session:", e);
        }
      }
      
      const stored = localStorage.getItem("road_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.isLoggedIn) {
            setUser(parsed);
            return;
          }
        } catch (e) {}
      }
      setUser(null);
    };

    checkUser();

    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          const u = session.user;
          setUser({
            name: u.user_metadata?.full_name || u.user_metadata?.name || "User",
          });
        } else {
          const stored = localStorage.getItem("road_user");
          if (!stored) {
            setUser(null);
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSignOut = async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Supabase signout failed:", err);
      }
    }
    localStorage.removeItem("road_user");
    setUser(null);
    toast.success("Signed out successfully");
    window.location.href = "/";
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.split("?")[0]);
  };

  return (
    <>
      {/* Solid Navbar (Non-transparent to prevent content bleed) */}
      <header
        className="fixed top-0 left-0 right-0 z-[100] bg-slate-900 border-b border-slate-800 shadow-md py-3 transition-all duration-300"
      >
        <div className="container-road">
          <div className="flex items-center justify-between">
            {/* Left: Logo */}
            <Logo size="md" />

            {/* Center: Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Main navigation">
              {navigationLinks.main.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                    isActive(link.href)
                      ? "text-amber-400 font-bold"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  )}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <motion.div
                      layoutId="navbarIndicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-amber-400 rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <ThemeToggle />

              {/* Saved Items */}
              <Link
                href="/dashboard/saved"
                className="relative p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                aria-label="Saved properties"
              >
                <Heart className="h-5 w-5" />
              </Link>

              {user ? (
                /* User Menu */
                <div className="flex items-center gap-3">
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm" className="hidden sm:flex border-slate-700 text-slate-200 hover:bg-slate-800">
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                /* Auth Buttons */
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800">
                      Log in
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="default" size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                      Sign up
                    </Button>
                  </Link>
                </div>
              )}

              {/* List Property CTA */}
              <Link href="/list-with-us" className="hidden md:block">
                <Button size="sm" className="gap-1.5 bg-white text-slate-950 hover:bg-slate-100 font-semibold shadow-xs">
                  <Plus className="h-4 w-4" />
                  List Property
                </Button>
              </Link>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-0 top-[65px] z-50 bg-slate-950/95 backdrop-blur-md lg:hidden flex flex-col p-6 overflow-y-auto"
          >
            <nav className="flex flex-col gap-2">
              {navigationLinks.main.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-3 rounded-xl font-medium text-base transition-colors",
                    isActive(link.href)
                      ? "bg-amber-500/20 text-amber-400 font-bold"
                      : "text-slate-300 hover:bg-slate-900"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
              <Link href="/list-with-us" className="block w-full">
                <Button className="w-full gap-2 bg-amber-500 text-slate-950 font-bold py-6 text-base">
                  <Plus className="h-5 w-5" />
                  List Property Free
                </Button>
              </Link>

              {!user && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link href="/login" className="block">
                    <Button variant="outline" className="w-full border-slate-700 text-white">
                      Log in
                    </Button>
                  </Link>
                  <Link href="/register" className="block">
                    <Button variant="secondary" className="w-full bg-slate-800 text-white">
                      Sign up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
