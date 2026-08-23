import Link from "next/link";
import { ArrowLeft, Home, Search, Building2, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary px-4 py-20 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg">
          <Compass className="w-12 h-12 text-amber-500 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-black uppercase tracking-widest text-amber-500">
            Error 404
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
            Page Not Found
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            The property, project, or page you are looking for might have been moved, renamed, or is temporarily unavailable.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/" className="w-full sm:w-auto">
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl gap-2 shadow-md">
              <Home className="w-4 h-4" /> Go to Homepage
            </Button>
          </Link>
          <Link href="/search" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full border-slate-300 dark:border-slate-700 text-text-primary font-bold rounded-xl gap-2 shadow-xs">
              <Search className="w-4 h-4 text-amber-500" /> Explore Search
            </Button>
          </Link>
        </div>

        <div className="pt-6 border-t border-border-default flex items-center justify-center gap-6 text-xs text-text-tertiary">
          <Link href="/search?type=projects" className="hover:text-amber-500 transition-colors font-medium">
            New Projects
          </Link>
          <span>•</span>
          <Link href="/properties" className="hover:text-amber-500 transition-colors font-medium">
            Properties
          </Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-amber-500 transition-colors font-medium">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
