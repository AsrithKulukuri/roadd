"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={cn(
        "w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 flex items-center justify-center transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95 shrink-0",
        className
      )}
      aria-label="Go back"
      title="Go back"
    >
      <ArrowLeft className="w-5 h-5 stroke-[2.5] text-slate-900 dark:text-white" />
    </button>
  );
}
