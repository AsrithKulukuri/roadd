"use client";

import { Share2, Heart, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompareStore } from "@/stores/compare-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useRouter } from "next/navigation";

interface PropertyActionsProps {
  propertyId: string;
}

export function PropertyActions({ propertyId }: PropertyActionsProps) {
  const router = useRouter();
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { toggleCompare, isCompared, comparePropertyIds } = useCompareStore();

  const isSaved = isFavorite(propertyId);
  const isComparing = isCompared(propertyId);

  return (
    <div className="flex items-center gap-2 md:mt-2">
      <Button 
        variant="outline" 
        size="icon" 
        className={`rounded-full w-10 h-10 border-border-default/50 ${isComparing ? 'text-amber-primary border-amber-primary/50' : ''}`}
        onClick={() => {
          toggleCompare(propertyId);
          if (!isComparing && comparePropertyIds.length >= 0) { // Will navigate when added
            router.push('/properties/compare');
          }
        }}
        title="Compare Property"
      >
        <Scale className="w-4 h-4" />
      </Button>
      <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-border-default/50">
        <Share2 className="w-4 h-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon" 
        className={`rounded-full w-10 h-10 border-border-default/50 ${isSaved ? 'text-amber-primary border-amber-primary/50' : ''}`}
        onClick={() => toggleFavorite(propertyId)}
      >
        <Heart className={`w-4 h-4 ${isSaved ? 'fill-amber-primary' : ''}`} />
      </Button>
    </div>
  );
}
