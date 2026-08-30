import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary",
        "placeholder:text-text-tertiary/70",
        "focus:outline-none focus:ring-2 focus:ring-amber-primary/30 focus:border-amber-primary",
        "hover:border-border-default/80",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors duration-200",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "min-h-[40px]",
        className
      )}
      ref={ref}
      suppressHydrationWarning
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
