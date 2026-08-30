"use client";

import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

// Fast, functional animation timings
export const MOTION_TRANSITION = {
  micro: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
  fast: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  standard: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  modal: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  spring: { type: "spring" as const, stiffness: 450, damping: 28 },
};

/**
 * Standard subtle fade-in wrapper
 */
export function MotionFadeIn({
  children,
  className,
  delay = 0,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.24, delay, ease: [0.16, 1, 0.3, 1] }
      }
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Standard subtle fade-up wrapper (translates Y by only 12px to avoid heavy shifts)
 */
export function MotionFadeUp({
  children,
  className,
  delay = 0,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              duration: 0.26,
              delay,
              ease: [0.16, 1, 0.3, 1],
            }
      }
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Micro-scale tap feedback wrapper for buttons and interactive badges
 */
export function MotionScaleTap({
  children,
  className,
  scale = 0.97,
  ...props
}: HTMLMotionProps<"div"> & { scale?: number }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      whileTap={shouldReduceMotion ? undefined : { scale }}
      transition={MOTION_TRANSITION.spring}
      className={cn("inline-flex cursor-pointer", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Card reveal wrapper with subtle entrance
 */
export function MotionCard({
  children,
  className,
  index = 0,
  ...props
}: HTMLMotionProps<"div"> & { index?: number }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              duration: 0.28,
              delay: Math.min(index * 0.04, 0.24),
              ease: [0.16, 1, 0.3, 1],
            }
      }
      className={cn("h-full", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
