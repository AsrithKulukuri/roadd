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
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navigationLinks } from "@/config/site";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.split("?")[0]);
  };

  return (
    <>
      {/* Desktop Navbar */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] transition-all duration-500",
          isScrolled
            ? "glass shadow-elevated py-2"
            : "bg-transparent py-4"
        )}
      >
        <div className="container-road">
          <div className="flex items-center justify-between">
            {/* Left: Logo */}
            <Logo size={isScrolled ? "sm" : "md"} />

            {/* Center: Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Main navigation">
              {navigationLinks.main.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                    isActive(link.href)
                      ? "text-amber-primary"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-card/50"
                  )}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-amber-primary rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              ))}
              <div className="relative group">
                <button
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-xl transition-all duration-200 hover:bg-bg-card/50"
                  aria-haspopup="true"
                >
                  More
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
                </button>
                <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="glass rounded-2xl p-2 min-w-[200px] shadow-elevated">
                    <Link
                      href="/mortgage-calculator"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card/50 rounded-xl transition-all"
                    >
                      EMI Calculator
                    </Link>
                    <Link
                      href="/blog"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card/50 rounded-xl transition-all"
                    >
                      Blog & Guides
                    </Link>
                    <Link
                      href="/about"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card/50 rounded-xl transition-all"
                    >
                      About ROAD FACING
                    </Link>
                    <Link
                      href="/contact"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card/50 rounded-xl transition-all"
                    >
                      Contact Us
                    </Link>
                  </div>
                </div>
              </div>
            </nav>

            {/* Right: Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-text-secondary hover:text-amber-primary"
                aria-label="Search properties"
              >
                <Search className="h-4.5 w-4.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-text-secondary hover:text-amber-primary relative"
                aria-label="Saved properties"
              >
                <Heart className="h-4.5 w-4.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-text-secondary hover:text-amber-primary relative"
                aria-label="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-primary rounded-full" />
              </Button>
              <ThemeToggle />
              <div className="w-px h-6 bg-border-default mx-1" />
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              </Button>
              <Button variant="amber" size="sm" asChild>
                <a href="https://wa.me/918977311418?text=I%20want%20to%20post%20a%20property" target="_blank" rel="noopener noreferrer" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Post Property
                </a>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 lg:hidden">
              <ThemeToggle size="sm" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-text-secondary"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[99] bg-bg-primary/98 backdrop-blur-sm lg:hidden"
          >
            <div className="flex flex-col h-full pt-20 pb-24 overflow-y-auto">
              <nav className="container-road flex flex-col gap-1 py-6" aria-label="Mobile navigation">
                {navigationLinks.main.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 text-lg font-medium rounded-xl transition-all",
                      isActive(link.href)
                        ? "text-amber-primary bg-amber-primary/10"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="h-px bg-border-default my-3" />
                <Link
                  href="/mortgage-calculator"
                  className="flex items-center gap-3 px-4 py-3.5 text-lg font-medium text-text-secondary hover:text-text-primary hover:bg-bg-card rounded-xl transition-all"
                >
                  EMI Calculator
                </Link>
                <Link
                  href="/blog"
                  className="flex items-center gap-3 px-4 py-3.5 text-lg font-medium text-text-secondary hover:text-text-primary hover:bg-bg-card rounded-xl transition-all"
                >
                  Blog
                </Link>
                <Link
                  href="/about"
                  className="flex items-center gap-3 px-4 py-3.5 text-lg font-medium text-text-secondary hover:text-text-primary hover:bg-bg-card rounded-xl transition-all"
                >
                  About
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center gap-3 px-4 py-3.5 text-lg font-medium text-text-secondary hover:text-text-primary hover:bg-bg-card rounded-xl transition-all"
                >
                  Contact
                </Link>
              </nav>

              <div className="container-road mt-auto flex flex-col gap-3 pb-6">
                <Button variant="outline" size="lg" className="w-full" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button variant="amber" size="lg" className="w-full" asChild>
                  <a href="https://wa.me/918977311418?text=I%20want%20to%20post%20a%20property" target="_blank" rel="noopener noreferrer" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Post Property Free
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] bg-bg-card/95 backdrop-blur-md border-t border-border-default lg:hidden pb-[env(safe-area-inset-bottom,0px)]"
        aria-label="Mobile bottom navigation"
      >
        <div className="flex items-center justify-around py-1.5 pt-2">
          <Link
            href="/"
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all",
              pathname === "/"
                ? "text-amber-primary"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            <Home className="h-5 w-5" />
            <span className="text-[0.625rem] font-medium">Home</span>
          </Link>
          <Link
            href="/properties"
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all",
              pathname.startsWith("/properties")
                ? "text-amber-primary"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            <Search className="h-5 w-5" />
            <span className="text-[0.625rem] font-medium">Search</span>
          </Link>
          <Link
            href="/properties/map"
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all",
              pathname.startsWith("/properties/map")
                ? "text-amber-primary"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            <MapPin className="h-5 w-5" />
            <span className="text-[0.625rem] font-medium">Map</span>
          </Link>
          <Link
            href="/dashboard/saved"
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all",
              pathname.startsWith("/dashboard/saved")
                ? "text-amber-primary"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            <Heart className="h-5 w-5" />
            <span className="text-[0.625rem] font-medium">Saved</span>
          </Link>
          <Link
            href="/dashboard"
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all",
              pathname === "/dashboard"
                ? "text-amber-primary"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            <User className="h-5 w-5" />
            <span className="text-[0.625rem] font-medium">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Floating Post Property CTA (Mobile) */}
      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] right-4 z-[95] lg:hidden">
        <Button
          variant="amber"
          size="icon-lg"
          className="rounded-full shadow-amber-glow animate-pulse-glow"
          asChild
        >
          <a href="https://wa.me/918977311418?text=I%20want%20to%20post%20a%20property" target="_blank" rel="noopener noreferrer" aria-label="Post a property">
            <Plus className="h-5 w-5" />
          </a>
        </Button>
      </div>
    </>
  );
}
