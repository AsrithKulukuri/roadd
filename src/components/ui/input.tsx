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
        "placeholder:text-text-tertiary",
        "focus:outline-none focus:ring-2 focus:ring-amber-primary/40 focus:border-amber-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-all duration-200",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
