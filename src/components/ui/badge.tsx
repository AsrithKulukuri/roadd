import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-primary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-amber-primary text-bg-primary",
        secondary:
          "border-border-default bg-bg-card text-text-secondary",
        outline:
          "border-border-default text-text-secondary",
        success:
          "border-transparent bg-success/15 text-success",
        warning:
          "border-transparent bg-warning/15 text-warning",
        error:
          "border-transparent bg-error/15 text-error",
        amber:
          "border-amber-primary/20 bg-amber-primary/10 text-amber-primary",
        rera:
          "border-success/30 bg-success/10 text-success font-bold",
        verified:
          "border-amber-primary/30 bg-amber-primary/10 text-amber-primary",
        premium:
          "border-amber-glow/30 bg-gradient-to-r from-amber-primary/15 to-amber-glow/15 text-amber-glow",
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
