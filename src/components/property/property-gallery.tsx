"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Grid2X2, Play, Camera, Tag } from "lucide-react";
import type { PropertyImage } from "@/types/property";

interface PropertyGalleryProps {
  images: PropertyImage[];
  title: string;
  videoUrl?: string;
  isReadyToMove?: boolean;
}

const DEFAULT_ROOM_TAGS = ["Living Room", "Master Bedroom", "Kitchen", "Floor Plan"];

export function PropertyGallery({ images, title, videoUrl, isReadyToMove = true }: PropertyGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const getYoutubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };
  const embedUrl = getYoutubeEmbedUrl(videoUrl);

  if (!images || images.length === 0) return null;

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <>
      {/* Realtor.com Style Main Photo Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 h-[320px] sm:h-[420px] lg:h-[500px] rounded-3xl overflow-hidden relative shadow-2xl bg-slate-950">
        
        {/* Main Hero Left Image (Takes 2 Columns on LG) */}
        <div 
          className="lg:col-span-2 relative h-full cursor-pointer group overflow-hidden"
          onClick={() => { setCurrentIndex(0); setIsOpen(true); }}
        >
          <Image
            src={typeof images[0] === "string" ? images[0] : (images[0] as any).url || images[0]}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/30 group-hover:from-slate-950/40 transition-colors" />

          {/* Realtor.com Badges on Top Left */}
          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-10">
            <span className="bg-emerald-600 text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
              <Tag className="w-3 h-3" /> Special Promotion
            </span>
            <span className="bg-slate-950/80 backdrop-blur-md text-white font-extrabold text-[11px] px-3 py-1 rounded-full border border-white/20">
              {isReadyToMove ? "Ready to Move" : "New Construction"}
            </span>
          </div>

          {/* Realtor.com Photo Counter Badge on Bottom Left */}
          <div className="absolute bottom-4 left-4 bg-slate-950/85 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full font-black text-xs border border-white/20 flex items-center gap-1.5 shadow-xl">
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>1/{images.length} - Listing Photos</span>
          </div>
        </div>

        {/* Realtor.com Small Image Right Stack (Takes 1 Column on LG) */}
        <div className="hidden lg:grid grid-cols-1 grid-rows-3 gap-2 h-full">
          {images.slice(1, 4).map((img, idx) => {
            const imgSrc = typeof img === "string" ? img : (img as any).url || img;
            const roomLabel = DEFAULT_ROOM_TAGS[idx] || "Property Photo";

            return (
              <div 
                key={idx} 
                className="relative h-full cursor-pointer group overflow-hidden rounded-xl border border-white/10"
                onClick={() => { setCurrentIndex(idx + 1); setIsOpen(true); }}
              >
                <Image
                  src={imgSrc}
                  alt={title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                
                {/* Room Name Tag Label (Realtor.com Style) */}
                <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md text-white font-bold text-[10px] px-2.5 py-1 rounded-md border border-white/10">
                  {roomLabel}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Floating Buttons (View All Photos & Watch Video) */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
          {embedUrl && (
            <Button
              onClick={() => setIsVideoOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-full px-4 py-2 shadow-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" /> Watch Video Tour
            </Button>
          )}

          <Button
            onClick={() => { setCurrentIndex(0); setIsOpen(true); }}
            className="bg-slate-950/90 hover:bg-slate-900 text-white border border-white/20 font-extrabold text-xs rounded-full px-4 py-2 shadow-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Grid2X2 className="w-4 h-4 text-amber-400" /> View All ({images.length})
          </Button>
        </div>
      </div>

      {/* Fullscreen Photo Gallery Lightbox Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl p-0 bg-slate-950 border-slate-800 text-white overflow-hidden">
          <DialogTitle className="sr-only">{title} Photo Gallery</DialogTitle>
          <DialogDescription className="sr-only">Full screen gallery images for {title}</DialogDescription>

          <div className="relative h-[80vh] w-full flex items-center justify-center bg-black">
            <Image
              src={typeof images[currentIndex] === "string" ? (images[currentIndex] as any) : (images[currentIndex] as any).url || images[currentIndex]}
              alt={title}
              fill
              className="object-contain"
            />

            <button
              onClick={handlePrev}
              className="absolute left-4 p-3 rounded-full bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 text-white transition-all cursor-pointer z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={handleNext}
              className="absolute right-4 p-3 rounded-full bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 text-white transition-all cursor-pointer z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-4 py-1.5 rounded-full font-bold text-xs border border-white/20">
              {currentIndex + 1} / {images.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
