"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-amber-primary text-bg-primary hover:bg-amber-hover active:scale-[0.98] shadow-sm hover:shadow-amber-subtle",
        secondary:
          "bg-bg-card text-text-primary border border-border-default hover:bg-bg-hover hover:border-amber-primary/30 active:scale-[0.98]",
        outline:
          "border border-border-default text-text-primary hover:bg-bg-card hover:border-amber-primary/30 active:scale-[0.98]",
        ghost:
          "text-text-secondary hover:text-text-primary hover:bg-bg-card active:scale-[0.98]",
        link: "text-amber-primary underline-offset-4 hover:underline p-0 h-auto",
        destructive:
          "bg-error text-white hover:bg-error/90 active:scale-[0.98]",
        amber:
          "bg-gradient-to-r from-amber-primary to-amber-hover text-bg-primary hover:shadow-amber-glow active:scale-[0.98] font-semibold",
        glass:
          "glass text-text-primary hover:bg-bg-hover/50 active:scale-[0.98]",
      },
      size: {
        sm: "h-8 rounded-lg px-3 text-xs",
        default: "h-10 rounded-xl px-5 text-sm",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-base font-semibold",
        icon: "h-10 w-10 rounded-xl",
        "icon-sm": "h-8 w-8 rounded-lg",
        "icon-lg": "h-12 w-12 rounded-xl",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
