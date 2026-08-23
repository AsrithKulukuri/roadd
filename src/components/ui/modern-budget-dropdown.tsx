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

interface ModernBudgetDropdownProps {
  value: number;
  options: BudgetOption[];
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  align?: "left" | "right";
  isMax?: boolean;
}

export function ModernBudgetDropdown({
  value,
  options,
  onChange,
  placeholder,
  className,
  align = "left",
  isMax = false,
}: ModernBudgetDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close desktop dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption
    ? selectedOption.label
    : isMax && value >= 100000000
    ? "Any Price"
    : placeholder || `${value}`;

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
        onClick={() => {
          haptic.light();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "w-full h-8 sm:h-8.5 px-3 pr-7 bg-slate-900/90 hover:bg-slate-900 border rounded-full text-xs font-bold text-white flex items-center justify-between outline-none cursor-pointer transition-all shadow-2xs text-left select-none",
          isOpen
            ? "border-amber-400 ring-2 ring-amber-500/20 bg-slate-950"
            : "border-slate-700/80 hover:border-slate-600"
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-amber-400 absolute right-2.5 top-1/2 -translate-y-1/2 stroke-[2.5] transition-transform duration-200 pointer-events-none",
            isOpen && "rotate-180 text-amber-300"
          )}
        />
      </button>

      {/* ── Mobile Portal-based Luxury Bottom Sheet ── */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="sm:hidden fixed inset-0 z-[99999]">
              {/* Solid Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/85 backdrop-blur-md"
              />

              {/* Bottom Sheet Drawer */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="fixed bottom-0 left-0 right-0 z-[100000] max-h-[75vh] bg-slate-950 border-t border-slate-800 rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden pb-6 safe-bottom"
              >
                {/* Drag Handle */}
                <div className="pt-3 pb-1.5 flex justify-center shrink-0">
                  <div className="w-10 h-1 rounded-full bg-slate-700" />
                </div>

                {/* Header */}
                <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white tracking-tight">
                        {isMax ? "Select Maximum Budget" : "Select Minimum Budget"}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Indian Rupees (₹)
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer active:scale-90"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Options List */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 no-scrollbar bg-slate-950">
                  {options.map((opt, i) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={`mob-portal-opt-${opt.label}-${opt.value}-${i}`}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={cn(
                          "w-full text-left h-12 px-4 rounded-2xl text-xs transition-all cursor-pointer select-none flex items-center justify-between border",
                          isSelected
                            ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md ring-2 ring-amber-500/20"
                            : "bg-slate-900 text-slate-100 font-bold border-slate-800 hover:bg-slate-850 hover:border-slate-700"
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
                <div className="px-4 pt-2.5 shrink-0 bg-slate-950">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-full h-11 bg-slate-900 hover:bg-slate-850 text-amber-400 border border-amber-500/40 rounded-full font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
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
                "absolute top-full mt-2 z-[500] min-w-[150px] w-full max-h-60 bg-slate-950/98 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl overflow-y-auto p-1.5 space-y-1 no-scrollbar",
                align === "right" ? "right-0" : "left-0"
              )}
            >
              {options.map((opt, i) => {
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
                        : "text-slate-200 hover:text-white hover:bg-slate-900 font-semibold active:scale-98"
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
