"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ROUTE ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary px-4 py-20 text-center">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-border-default shadow-xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto shadow-xs">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-black uppercase tracking-widest text-amber-500">
            Recoverable Error
          </span>
          <h1 className="font-heading text-2xl font-bold text-text-primary tracking-tight">
            Something went wrong
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
            We encountered an issue while loading this page. Please try again or return to the homepage.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl gap-2 shadow-md cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </Button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm shadow-xs transition-colors gap-2"
          >
            <Home className="w-4 h-4 text-amber-500" /> Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
