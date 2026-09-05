"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X, IndianRupee, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";

export interface BudgetOption {
  label: string;
  value: number;
}

function formatDropdownPrice(val: number, isMax: boolean, placeholder?: string, maxCap = 100000000): string {
  if (isMax && val >= maxCap) return "Any Price";
  if (!isMax && val <= 0) return placeholder || "₹ 0";
  if (val >= 10000000) {
    const cr = val / 10000000;
    const formatted = cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2).replace(/\.?0+$/, "");
    return `₹ ${formatted} Cr`;
  }
  if (val >= 100000) {
    const l = val / 100000;
    const formatted = l % 1 === 0 ? l.toFixed(0) : l.toFixed(2).replace(/\.?0+$/, "");
    return `₹ ${formatted} L`;
  }
  if (val >= 1000) {
    return `₹ ${(val / 1000).toFixed(0)}K`;
  }
  return `₹ ${val.toLocaleString("en-IN")}`;
}

import { useIsMounted } from "@/hooks/use-is-mounted";

interface ModernBudgetDropdownProps {
  value: number;
  options: BudgetOption[];
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  align?: "left" | "right";
  isMax?: boolean;
  maxCap?: number;
}

export function ModernBudgetDropdown({
  value,
  options,
  onChange,
  placeholder,
  className,
  align = "left",
  isMax = false,
  maxCap = 100000000,
}: ModernBudgetDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const mounted = useIsMounted();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click (excluding both container and portal content)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !(target instanceof Element && target.closest("[data-budget-portal]"))
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  // Lock body scroll on mobile bottom sheet open
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Dynamic options that always includes the active value if not already in options
  const displayOptions = (options.some((opt) => opt.value === value))
    ? options
    : (() => {
        const customLabel = formatDropdownPrice(value, isMax, placeholder, maxCap);
        const customOpt: BudgetOption = { label: customLabel, value };
        return [...options, customOpt].sort((a, b) => a.value - b.value);
      })();

  const selectedOption = displayOptions.find((opt) => opt.value === value);
  const displayLabel = selectedOption
    ? selectedOption.label
    : formatDropdownPrice(value, isMax, placeholder, maxCap);

  const handleSelect = (val: number) => {
    haptic.selection();
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative flex-1", className)}>
      {/* Pill Trigger */}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={isMax ? "Select Maximum Budget" : "Select Minimum Budget"}
        onClick={() => {
          haptic.light();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "w-full h-8 sm:h-8.5 px-3 pr-7 bg-white hover:bg-slate-50 border rounded-full text-xs font-bold text-slate-950 flex items-center justify-between outline-none cursor-pointer transition-all shadow-xs text-left select-none",
          isOpen
            ? "border-amber-500 ring-2 ring-amber-500/20 bg-white"
            : "border-amber-500/50 hover:border-amber-500"
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          strokeWidth={2.5}
          className={cn(
            "w-3.5 h-3.5 text-amber-500 absolute right-2.5 top-1/2 -translate-y-1/2 transition-transform duration-200 pointer-events-none",
            isOpen && "rotate-180 text-amber-600"
          )}
        />
      </button>

      {/* ── Mobile Portal-based Luxury Bottom Sheet ── */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div data-budget-portal="true" className="sm:hidden fixed inset-0 z-[99999]">
              {/* Solid Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              />

              {/* Bottom Sheet Drawer */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="fixed bottom-0 left-0 right-0 z-[100000] max-h-[75vh] bg-white border-t-2 border-amber-500 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden pb-6 safe-bottom"
              >
                {/* Drag Handle */}
                <div className="pt-3 pb-1.5 flex justify-center shrink-0">
                  <div className="w-10 h-1 rounded-full bg-slate-300" />
                </div>

                {/* Header */}
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-500/30 flex items-center justify-center text-amber-600">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-950 tracking-tight">
                        {isMax ? "Select Maximum Budget" : "Select Minimum Budget"}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Indian Rupees (₹)
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer active:scale-90"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Options List */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 no-scrollbar bg-white">
                  {displayOptions.map((opt, i) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={`mob-portal-opt-${opt.label}-${opt.value}-${i}`}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={cn(
                          "w-full text-left h-12 px-4 rounded-2xl text-xs transition-all cursor-pointer select-none flex items-center justify-between border",
                          isSelected
                            ? "bg-amber-500 text-slate-950 border-amber-500 font-black shadow-md ring-2 ring-amber-500/20"
                            : "bg-slate-50 text-slate-900 font-bold border-slate-200 hover:bg-amber-50 hover:border-amber-500/40"
                        )}
                      >
                        <span className="text-sm tracking-tight">{opt.label}</span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Done CTA */}
                <div className="px-4 pt-2.5 shrink-0 bg-white">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-full font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                    <span>Done</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Desktop Floating Luxury Popover List ── */}
      <div className="hidden sm:block">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={cn(
                "absolute top-full mt-2 z-[500] min-w-[150px] w-full max-h-60 bg-white border-2 border-amber-500 rounded-2xl shadow-2xl overflow-y-auto p-1.5 space-y-1 no-scrollbar",
                align === "right" ? "right-0" : "left-0"
              )}
            >
              {displayOptions.map((opt, i) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={`desk-opt-${opt.label}-${opt.value}-${i}`}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer select-none flex items-center justify-between",
                      isSelected
                        ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                        : "text-slate-900 hover:text-slate-950 hover:bg-amber-50 font-bold active:scale-98"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 stroke-[3] text-slate-950 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
