"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none touch-manipulation",
  {
    variants: {
      variant: {
        default:
          "bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] shadow-sm [&_svg]:text-amber-400 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white",
        secondary:
          "bg-bg-card text-text-primary border border-border-default hover:bg-bg-hover hover:border-amber-primary/40 active:scale-[0.98] shadow-xs",
        outline:
          "border border-border-default text-text-primary bg-transparent hover:bg-bg-card hover:border-amber-primary/40 active:scale-[0.98]",
        ghost:
          "text-text-secondary hover:text-text-primary hover:bg-bg-hover active:scale-[0.98]",
        link: "text-amber-primary underline-offset-4 hover:underline p-0 h-auto font-medium",
        destructive:
          "bg-error text-white hover:bg-error/90 active:scale-[0.98] shadow-sm",
        amber:
          "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold active:scale-[0.98] shadow-sm border border-amber-400/50",
        glass:
          "glass text-text-primary hover:bg-bg-hover/80 active:scale-[0.98] shadow-xs",
      },
      size: {
        sm: "h-8.5 rounded-lg px-3 text-xs min-h-[34px]",
        default: "h-10 rounded-xl px-5 text-sm min-h-[40px] sm:min-h-[40px]",
        lg: "h-12 rounded-xl px-7 text-base font-semibold min-h-[44px]",
        xl: "h-14 rounded-2xl px-9 text-base font-bold min-h-[48px]",
        icon: "h-10 w-10 rounded-xl min-h-[40px] min-w-[40px]",
        "icon-sm": "h-8.5 w-8.5 rounded-lg min-h-[34px] min-w-[34px]",
        "icon-lg": "h-12 w-12 rounded-xl min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading ? "true" : undefined}
        suppressHydrationWarning
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-current" />
            <span className="opacity-80">{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
