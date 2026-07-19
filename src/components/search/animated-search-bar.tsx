"use client";

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Apartments in Vijayawada",
  "Luxury villas in Guntur",
  "3 BHK in Mangalagiri",
  "Shops in Benz Circle",
  "Houses in Autonagar",
  "Plots near Amaravati",
  "Properties in Patamata",
  "Farm lands in Krishna District",
];

const TYPING_SPEED = 60;
const DELETING_SPEED = 35;
const PAUSE_DURATION = 1500;

export function AnimatedSearchBar({
  className,
  onSearch,
  onExpand,
  isExpanded = false,
}: {
  className?: string;
  onSearch?: (query: string) => void;
  onExpand?: () => void;
  isExpanded?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Typewriter state
  const [displayText, setDisplayText] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // If the user has typed something, we don't need to animate the placeholder
    // But we still keep the state running in the background so if they clear it, it resumes nicely.
    let timeout: NodeJS.Timeout;

    const currentSuggestion = SUGGESTIONS[suggestionIndex];

    if (isDeleting) {
      if (displayText === "") {
        setIsDeleting(false);
        setSuggestionIndex((prev) => (prev + 1) % SUGGESTIONS.length);
      } else {
        timeout = setTimeout(() => {
          setDisplayText((prev) => prev.slice(0, -1));
        }, DELETING_SPEED);
      }
    } else {
      if (displayText === currentSuggestion) {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, PAUSE_DURATION);
      } else {
        timeout = setTimeout(() => {
          setDisplayText((prev) =>
            currentSuggestion.slice(0, prev.length + 1)
          );
        }, TYPING_SPEED);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, suggestionIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query.trim());
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={false}
      animate={{
        boxShadow: isFocused
          ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        borderColor: isFocused ? "#d1d5db" : "#E5E7EB",
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "relative flex items-center w-full max-w-3xl mx-auto bg-white border border-[#E5E7EB] rounded-[9999px] h-[60px] px-6 overflow-hidden transition-colors group hover:border-gray-300 hover:shadow-md",
        className
      )}
    >
      <Search
        className={cn(
          "w-6 h-6 mr-3 transition-colors duration-300 flex-shrink-0",
          isFocused ? "text-primary" : "text-gray-400 group-hover:text-gray-500"
        )}
      />

      <div className="relative flex-grow h-full flex items-center z-10" style={{ WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)', maskImage: 'linear-gradient(to right, black 85%, transparent 100%)' }}>
        {/* Animated Placeholder Layer */}
        {!query && (
          <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden">
            <span className="text-[#6B7280] text-[13px] sm:text-base md:text-lg font-medium tracking-wide whitespace-nowrap">
              {displayText}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="inline-block w-[2px] h-[1em] bg-[#6B7280] ml-[2px] align-middle"
              />
            </span>
          </div>
        )}

        {/* Actual Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (onExpand) onExpand();
          }}
          onClick={() => {
            if (onExpand) onExpand();
          }}
          onBlur={() => setIsFocused(false)}
          style={{ boxShadow: 'none', outline: 'none', border: 'none' }}
          className="w-full h-full bg-transparent border-0 !border-none outline-none focus:!border-transparent focus:!ring-0 focus:!outline-none focus:!shadow-none !shadow-none text-[13px] sm:text-base md:text-lg font-medium text-gray-900 placeholder-transparent p-0 m-0"
          placeholder=""
        />
      </div>

      <motion.button
        type={isExpanded ? "submit" : "button"}
        onClick={(e) => {
          if (!isExpanded && onExpand) {
            e.preventDefault();
            onExpand();
          }
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="ml-2 sm:ml-4 bg-amber-primary text-bg-primary shadow-amber-glow rounded-full px-4 sm:px-6 py-2 sm:py-2.5 font-semibold text-xs sm:text-sm tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-amber-primary/50 focus:ring-offset-2 flex-shrink-0"
      >
        Search
      </motion.button>
    </motion.form>
  );
}
