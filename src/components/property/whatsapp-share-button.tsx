"use client";

import { useState } from "react";
import { shareOnWhatsApp } from "@/lib/whatsapp/whatsapp-share";
import { shareItem } from "@/lib/share-utils";
import { MessageCircle, Share2, Send, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";

// Official WhatsApp SVG icon
export function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
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
