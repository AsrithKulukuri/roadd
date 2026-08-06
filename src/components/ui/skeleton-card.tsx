"use client";

export function SkeletonCard() {
  return (
    <div className="relative bg-white dark:bg-bg-card border border-border-default rounded-3xl overflow-hidden shadow-sm animate-pulse">
      {/* Image Skeleton */}
      <div className="relative aspect-[16/9] bg-slate-200 dark:bg-slate-800" />
      
      <div className="p-5 flex flex-col gap-4">
        {/* Name and builder */}
        <div className="space-y-2">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
        </div>

        {/* Info tags skeleton */}
        <div className="flex gap-2">
          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-border-default w-full" />

        {/* Price Skeleton */}
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
          <div className="h-10 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
