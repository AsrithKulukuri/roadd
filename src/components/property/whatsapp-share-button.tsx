"use client";

import { useState } from "react";
import { shareOnWhatsApp } from "@/lib/whatsapp/whatsapp-share";
import { shareItem } from "@/lib/share-utils";
import { MessageCircle, Share2, Send, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";

// Clean custom WhatsApp SVG icon
export function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

interface WhatsAppShareButtonProps {
  item: Property | Project | any;
  type?: "property" | "project";
  variant?: "icon" | "pill" | "full" | "minimal";
  className?: string;
  source?: "card" | "detail" | "admin" | "map";
}

export function WhatsAppShareButton({
  item,
  type = "property",
  variant = "icon",
  className = "",
  source = "card",
}: WhatsAppShareButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    shareOnWhatsApp({ item, type, source });
  };

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={handleWhatsAppShare}
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${className}`}
        title="Share on WhatsApp"
      >
        <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-500/20 text-emerald-500" />
        <span>Share on WhatsApp</span>
      </button>
    );
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleWhatsAppShare}
        className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md active:scale-[0.98] cursor-pointer ${className}`}
      >
        <WhatsAppIcon className="w-4 h-4 fill-white/20 text-white" />
        <span>Share via WhatsApp</span>
      </button>
    );
  }

  // Default: circular icon button for cards & overlays
  return (
    <button
      type="button"
      onClick={handleWhatsAppShare}
      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/50 cursor-pointer ${className}`}
      title="Share property on WhatsApp"
    >
      <WhatsAppIcon className="w-4 h-4 fill-emerald-500/20 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
    </button>
  );
}
