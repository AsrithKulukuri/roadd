"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  LogOut,
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
  const [openMobileSubmenus, setOpenMobileSubmenus] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<any>(null);

  const toggleMobileSubmenu = (label: string) => {
    setOpenMobileSubmenus(prev => ({ ...prev, [label]: !prev[label] }));
  };
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname, searchParams]);

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
    
    const [path, query] = href.split("?");
    if (pathname !== path) return false;

    if (query) {
      const urlParams = new URLSearchParams(query);
      
      // Check if all link parameters exist in the current URL
      for (const [key, value] of urlParams.entries()) {
        if (searchParams.get(key) !== value) {
          return false;
        }
      }
      
      // Prevent general links (like Buy) from being active when a more specific category is selected
      if (path === "/search" && !urlParams.has("propertyType") && searchParams.has("propertyType")) {
        return false;
      }
      
      return true;
    }
    
    return pathname.startsWith(path);
  };

  const isTransparent = pathname === "/" && !isScrolled;

  return (
    <>
      {/* Realtor.com Style Clean Navbar */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] h-16 flex items-center transition-all duration-300",
          isTransparent
            ? "bg-transparent border-transparent"
            : "bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm"
        )}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 w-full">
          <div className="flex items-center justify-between">
            {/* Left: Brand Logo */}
            <Logo size="md" isDarkBg={isTransparent} />

            {/* Center: Navigation Links for Desktop */}
            <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Main navigation">
              {navigationLinks.main.map((link) => (
                <div key={link.href} className="relative group">
                  <Link
                    href={link.href}
                    className={cn(
                      "relative px-4 py-2 text-sm font-bold rounded-xl transition-all duration-200 block",
                      isActive(link.href)
                        ? "text-amber-500 font-black"
                        : isTransparent
                          ? "text-white hover:text-amber-400 hover:bg-white/10"
                          : "text-slate-900 dark:text-slate-100 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {link.label}
                      {(link as any).subItems && <ChevronDown className="w-3.5 h-3.5 opacity-50 transition-transform group-hover:rotate-180" />}
                    </span>
                    {isActive(link.href) && (
                      <motion.div
                        layoutId="navbarIndicator"
                        className="absolute bottom-0 left-3 right-3 h-0.5 bg-amber-500 rounded-full"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                  </Link>

                  {/* Desktop Dropdown */}
                  {(link as any).subItems && (
                    <div className="absolute top-full left-0 pt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-2">
                        {(link as any).subItems.map((subItem: any) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className="block px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400"
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Right Action Icons & Controls */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              <ThemeToggle />

              {/* Saved Items Heart Button */}
              <Link
                href="/dashboard/saved"
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  isTransparent
                    ? "text-white hover:bg-white/10"
                    : "text-slate-900 dark:text-slate-100 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
                aria-label="Saved properties"
              >
                <Heart className="h-5 w-5 stroke-[2.5]" />
              </Link>

              {user ? (
                /* User Menu for Desktop */
                <div className="hidden sm:flex items-center gap-2">
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs">
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-900 dark:text-slate-100 font-extrabold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                /* Auth Buttons for Desktop */
                <div className="hidden sm:flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="default" size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-5">
                      Log in
                    </Button>
                  </Link>
                </div>
              )}

              {/* List Property CTA Button */}
              <Link href="/list-with-us" className="hidden md:block">
                <Button size="sm" className="gap-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold shadow-xs">
                  <Plus className="h-4 w-4" />
                  List Property
                </Button>
              </Link>

              {/* Mobile Menu Toggle Hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={cn(
                  "lg:hidden p-2 rounded-xl transition-colors cursor-pointer",
                  isTransparent
                    ? "text-white hover:bg-white/10"
                    : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-0 top-[60px] z-50 bg-white/98 backdrop-blur-md lg:hidden flex flex-col p-6 overflow-y-auto"
          >
            <nav className="flex flex-col gap-2">
              {navigationLinks.main.map((link) => (
                <div key={link.href} className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <Link
                      href={link.href}
                      className={cn(
                        "flex-1 px-4 py-3 rounded-xl font-semibold text-base transition-colors",
                        isActive(link.href)
                          ? "bg-amber-500/10 text-amber-600 font-bold"
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                      onClick={(e) => {
                        // If it has subItems and is clicked, we just navigate. The toggle handles expanding.
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {link.label}
                    </Link>
                    {(link as any).subItems && (
                      <button
                        onClick={() => toggleMobileSubmenu(link.label)}
                        className="p-3 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        <ChevronDown className={cn("w-5 h-5 transition-transform", openMobileSubmenus[link.label] && "rotate-180")} />
                      </button>
                    )}
                  </div>
                  
                  {/* Mobile Submenu */}
                  {(link as any).subItems && openMobileSubmenus[link.label] && (
                    <div className="flex flex-col ml-6 border-l-2 border-slate-200 dark:border-slate-800 pl-4 mt-1 space-y-1">
                      {(link as any).subItems.map((subItem: any) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-amber-500 rounded-lg"
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <Link href="/list-with-us" className="block w-full">
                <Button className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-6 text-base shadow-md">
                  <Plus className="h-5 w-5 stroke-[3]" />
                  List Property Free
                </Button>
              </Link>

              {user ? (
                <div className="space-y-2 pt-2">
                  <Link href="/dashboard" className="block">
                    <Button variant="outline" className="w-full bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold justify-start shadow-xs">
                      <User className="w-4 h-4 mr-2" /> My Dashboard ({user.name})
                    </Button>
                  </Link>
                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    className="w-full text-red-600 dark:text-red-400 font-extrabold hover:bg-slate-100 dark:hover:bg-slate-800 justify-start"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                  </Button>
                </div>
              ) : (
                <div className="pt-2">
                  <Link href="/login" className="block w-full">
                    <Button variant="outline" className="w-full bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold shadow-xs">
                      Log in
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
