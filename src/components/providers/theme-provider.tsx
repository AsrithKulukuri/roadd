"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

// Suppress known dev-only false positive warnings:
// 1. React 19 script tag warning from next-themes
// 2. Browser extension autofill attributes (e.g. fdprocessedid from password managers) causing harmless hydration mismatches
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    const fullMsg = args
      .map((a) => (typeof a === "string" ? a : a instanceof Error ? a.message : ""))
      .join(" ");

    if (
      fullMsg.includes("Encountered a script tag while rendering React component") ||
      fullMsg.includes("fdprocessedid") ||
      (fullMsg.includes("hydrated but some attributes") && fullMsg.includes("fdprocessedid"))
    ) {
      return;
    }
    orig.apply(console, args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
