"use client";

import { useState } from "react";
import { shareOnWhatsApp } from "@/lib/whatsapp/whatsapp-share";
import { shareItem } from "@/lib/share-utils";
import { MessageCircle, Share2, Send, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";

// Official WhatsApp SVG icon (authentic #25D366 green + white phone)
export function WhatsAppIcon({
  className = "w-4 h-4",
  color = "#25D366",
  phoneColor = "#FFFFFF",
}: {
  className?: string;
  color?: string;
  phoneColor?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" className={className} aria-hidden="true">
      <path fill={color} d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2z"/>
      <path fill={phoneColor} d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"/>
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
