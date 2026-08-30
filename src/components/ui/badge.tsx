import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-primary focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-slate-900 text-white dark:bg-white dark:text-slate-950",
        secondary:
          "border-border-default bg-bg-elevated text-text-secondary",
        outline:
          "border-border-default text-text-secondary bg-transparent",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        warning:
          "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        error:
          "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400",
        info:
          "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400",
        amber:
          "border-amber-primary/30 bg-amber-primary/10 text-amber-600 dark:text-amber-400 font-bold",
        rera:
          "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold",
        verified:
          "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold",
        featured:
          "border-amber-400/40 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold shadow-xs",
        recommended:
          "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold",
        budget:
          "border-teal-500/30 bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold",
        premium:
          "border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-amber-300/15 text-amber-700 dark:text-amber-300 font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
