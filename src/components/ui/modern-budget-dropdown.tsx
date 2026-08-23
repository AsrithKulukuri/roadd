"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
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

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption
    ? selectedOption.label
    : isMax && value >= 100000000
    ? "Any Price"
    : placeholder || `${value}`;

  return (
    <div ref={containerRef} className={cn("relative flex-1", className)}>
      {/* Pill Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-8 px-3 pr-7 bg-slate-50 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 border rounded-full text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between outline-none cursor-pointer transition-all shadow-2xs text-left select-none",
          isOpen
            ? "border-amber-500 ring-2 ring-amber-500/20"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-slate-500 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 stroke-[2.5] transition-transform duration-200 pointer-events-none",
            isOpen && "rotate-180 text-amber-500"
          )}
        />
      </button>

      {/* Modern Popover List (No emojis, no icons, pure clean typography) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute top-full mt-1.5 z-[500] min-w-[130px] w-full max-h-56 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-y-auto p-1.5 space-y-0.5 no-scrollbar",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={`${opt.label}-${opt.value}-${i}`}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-xs transition-all cursor-pointer select-none flex items-center justify-between",
                    isSelected
                      ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                      : "text-slate-200 hover:text-white hover:bg-slate-900 font-semibold active:scale-98"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-950 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
