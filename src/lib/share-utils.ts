import { toast } from "sonner";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";
import { formatWhatsAppPropertyMessage } from "./whatsapp/whatsapp-share";

export interface ShareItemOptions {
  item: Property | Project | any;
  type?: "property" | "project";
}

/**
 * Shares a property or project card with a clean, luxury format.
 */
export async function shareItem({ item, type }: ShareItemOptions) {
  if (!item) return;

  const { text, url, refId, title } = formatWhatsAppPropertyMessage(item, type);

  // Try native Web Share API
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: `${refId}: ${title}`,
        text: text,
      });
      toast.success(`Shared ${refId} (${title})`);
      return;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return; // User closed the share sheet
      }
    }
  }

  // Fallback: Copy formatted text and link to clipboard
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`📋 Copied ${refId} details to clipboard!`);
    } catch {
      toast.error("Failed to copy link");
    }
  }
}
