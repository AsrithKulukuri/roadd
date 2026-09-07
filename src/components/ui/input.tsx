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
        "flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-slate-900 dark:text-white",
        "placeholder:text-slate-400 dark:placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500",
        "hover:border-slate-300 dark:hover:border-slate-700",
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
