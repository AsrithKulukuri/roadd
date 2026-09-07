"use client";

import { useMemo } from "react";
import { Share2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavoritesStore } from "@/stores/favorites-store";
import { usePropertiesStore } from "@/stores/properties-store";
import { toast } from "sonner";
import {
  getWhatsAppShareUrl,
  formatWhatsAppPropertyMessage,
  trackWhatsAppShare,
} from "@/lib/whatsapp/whatsapp-share";
import { haptic } from "@/lib/haptics";
import type { Property } from "@/types/property";

interface PropertyActionsProps {
  propertyId: string;
  property?: Property;
}

export function PropertyActions({ propertyId, property }: PropertyActionsProps) {
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const storeProperty = usePropertiesStore((state) => 
    state.properties.find((p) => p.id === propertyId || p.slug === propertyId)
  );
  const activeProperty = property || storeProperty || { id: propertyId, title: "Property Listing" };

  const isSaved = isFavorite(propertyId);

  const { refId, title: shareTitle } = useMemo(() => {
    return formatWhatsAppPropertyMessage(activeProperty, "property");
  }, [activeProperty]);

  const shareUrl = useMemo(() => {
    return getWhatsAppShareUrl({ item: activeProperty, type: "property" });
  }, [activeProperty]);

  return (
    <div className="flex items-center gap-2 shrink-0">

      {/* 2. Share Button */}
      <Button 
        id="property-share-button"
        asChild
        variant="outline" 
        size="icon" 
        className="rounded-full w-10 h-10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 hover:border-amber-500 transition-all cursor-pointer shadow-xs"
        title="Share Property on WhatsApp"
        aria-label="Share property on WhatsApp"
      >
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            haptic.medium();
            trackWhatsAppShare(activeProperty.id, refId, "detail");
            toast.success(`Opening WhatsApp for ${refId} (${shareTitle})`);
          }}
        >
          <Share2 className="w-4 h-4 text-slate-900 dark:text-white stroke-[2.5]" />
        </a>
      </Button>

      {/* 3. Save / Heart Button */}
      <Button 
        type="button"
        variant="outline" 
        size="icon" 
        className={`rounded-full w-10 h-10 border transition-all cursor-pointer shadow-xs ${
          isSaved 
            ? 'bg-red-500/15 border-red-500 text-red-500' 
            : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 hover:border-red-500'
        }`}
        onClick={() => {
          toggleFavorite(propertyId);
          toast.success(isSaved ? "Removed from saved properties" : "Saved to favorites!");
        }}
        title={isSaved ? "Remove from Saved" : "Save Property"}
      >
        <Heart className={`w-4 h-4 stroke-[2.5] ${isSaved ? 'text-red-500 fill-red-500' : 'text-slate-900 dark:text-white'}`} />
      </Button>
    </div>
  );
}
