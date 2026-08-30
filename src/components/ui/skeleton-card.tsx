"use client";

export function SkeletonCard() {
  return (
    <div className="relative bg-white dark:bg-bg-card border border-border-default rounded-2xl overflow-hidden shadow-card animate-pulse">
      {/* Image Skeleton */}
      <div className="relative aspect-[16/10] bg-slate-200 dark:bg-slate-800" />
      
      <div className="p-4 sm:p-5 flex flex-col gap-3.5">
        {/* Name and location */}
        <div className="space-y-2">
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
        </div>

        {/* Info tags skeleton */}
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>

        {/* Divider */}
        <div className="h-px bg-border-default w-full" />

        {/* Price Skeleton */}
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <div className="h-3 w-14 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
          <div className="h-9 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
