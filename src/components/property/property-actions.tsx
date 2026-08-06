"use client";

import { useState } from "react";
import { Share2, Heart, Scale, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompareStore } from "@/stores/compare-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PropertyActionsProps {
  propertyId: string;
}

export function PropertyActions({ propertyId }: PropertyActionsProps) {
  const router = useRouter();
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { toggleCompare, isCompared } = useCompareStore();
  const [copied, setCopied] = useState(false);

  const isSaved = isFavorite(propertyId);
  const isComparing = isCompared(propertyId);

  const handleShare = async () => {
    const shareData = {
      title: "ROAD FACING Property",
      text: "Check out this property listing on ROAD FACING!",
      url: window.location.href,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  const copyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Property link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* 1. Compare Button */}
      <Button 
        type="button"
        variant="outline" 
        size="icon" 
        className={`rounded-full w-10 h-10 border transition-all cursor-pointer shadow-xs ${
          isComparing 
            ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold' 
            : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 hover:border-amber-500'
        }`}
        onClick={() => {
          toggleCompare(propertyId);
          toast.success(isComparing ? "Removed from comparison" : "Added to comparison");
          if (!isComparing) {
            router.push('/properties/compare');
          }
        }}
        title={isComparing ? "Remove from Compare" : "Compare Property"}
      >
        <Scale className={`w-4 h-4 stroke-[2.5] ${isComparing ? 'text-slate-950' : 'text-slate-900 dark:text-white'}`} />
      </Button>

      {/* 2. Share Button */}
      <Button 
        type="button"
        variant="outline" 
        size="icon" 
        className="rounded-full w-10 h-10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 hover:border-amber-500 transition-all cursor-pointer shadow-xs"
        onClick={handleShare}
        title="Share Property"
      >
        {copied ? (
          <Check className="w-4 h-4 text-amber-500 stroke-[3]" />
        ) : (
          <Share2 className="w-4 h-4 text-slate-900 dark:text-white stroke-[2.5]" />
        )}
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
