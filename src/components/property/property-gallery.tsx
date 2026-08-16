"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  Grid2X2, 
  Play, 
  Camera, 
  Tag, 
  X, 
  ArrowLeft,
  Film
} from "lucide-react";
import type { PropertyImage } from "@/types/property";
import { getYoutubeEmbedUrl, isYoutubeShort, cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/aws/storage-utils";

interface PropertyGalleryProps {
  images: PropertyImage[];
  title: string;
  videoUrl?: string;
  videoThumbnail?: string;
  isReadyToMove?: boolean;
}

const DEFAULT_ROOM_TAGS = ["Living Room", "Master Bedroom", "Kitchen", "Floor Plan"];

export function PropertyGallery({ 
  images, 
  title, 
  videoUrl, 
  videoThumbnail,
  isReadyToMove = true 
}: PropertyGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const embedUrl = getYoutubeEmbedUrl(videoUrl);
  const isShort = isYoutubeShort(videoUrl);
  const hasVideo = Boolean(videoUrl && videoUrl.trim());

  if (!images || images.length === 0) return null;

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  // Effective thumbnail for video card
  const videoCoverSrc = videoThumbnail 
    ? resolveMediaUrl(videoThumbnail) 
    : (images[1] ? (typeof images[1] === "string" ? images[1] : (images[1] as any).url || images[1]) : (typeof images[0] === "string" ? images[0] : (images[0] as any).url || images[0]));

  return (
    <>
      {/* Realtor.com Style Main Photo Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 h-[320px] sm:h-[420px] lg:h-[500px] rounded-3xl overflow-hidden relative shadow-md bg-slate-100 dark:bg-slate-900">
        
        {/* Main Hero Left Image (Takes 2 Columns on LG) */}
        <div 
          className="lg:col-span-2 relative h-full cursor-pointer group overflow-hidden"
          onClick={() => { setCurrentIndex(0); setIsOpen(true); }}
        >
          <Image
            src={resolveMediaUrl(typeof images[0] === "string" ? images[0] : (images[0] as any).url || images[0])}
            alt={title}
            fill
            unoptimized
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/30 group-hover:from-slate-950/40 transition-colors" />

          {/* Realtor.com Badges on Top Left */}
          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-10">
            <span className="bg-slate-950/80 backdrop-blur-md text-white font-extrabold text-[11px] px-3 py-1 rounded-full border border-white/20">
              {isReadyToMove ? "Ready to Move" : "New Construction"}
            </span>
          </div>
        </div>

        {/* Small Image / Video Right Stack (Takes 1 Column on LG) */}
        <div className="hidden lg:grid grid-cols-1 grid-rows-3 gap-2 h-full">
          {/* Top Tile: Video Tour Card if video exists, otherwise 2nd Image */}
          {hasVideo ? (
            <div 
              className="relative h-full cursor-pointer group overflow-hidden rounded-xl border border-amber-500/30 bg-slate-950 shadow-md"
              onClick={() => setIsVideoOpen(true)}
            >
              <Image
                src={videoCoverSrc}
                alt={`${title} Video Tour`}
                fill
                unoptimized
                className="object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40 group-hover:from-black/60 transition-colors" />
              
              {/* Centered Glowing Play Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-12 h-12 rounded-full bg-red-600/40 animate-ping" />
                  <div className="relative w-11 h-11 rounded-full bg-red-600 group-hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                    <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Video Tag Label */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                <span className="bg-slate-950/90 backdrop-blur-md text-white font-black text-[10px] px-2.5 py-1 rounded-md border border-white/20 flex items-center gap-1">
                  <Film className="w-3 h-3 text-amber-400" />
                  <span>Video Tour</span>
                </span>
                <span className="text-[10px] font-bold text-amber-300 drop-shadow-md">
                  Watch Now
                </span>
              </div>
            </div>
          ) : (
            images[1] && (
              <div 
                className="relative h-full cursor-pointer group overflow-hidden rounded-xl border border-white/10"
                onClick={() => { setCurrentIndex(1); setIsOpen(true); }}
              >
                <Image
                  src={resolveMediaUrl(typeof images[1] === "string" ? images[1] : (images[1] as any).url || images[1])}
                  alt={title}
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md text-white font-bold text-[10px] px-2.5 py-1 rounded-md border border-white/10">
                  {DEFAULT_ROOM_TAGS[0] || "Property Photo"}
                </div>
              </div>
            )
          )}

          {/* 2nd & 3rd Stack Tiles */}
          {images.slice(hasVideo ? 1 : 2, hasVideo ? 3 : 4).map((img, idx) => {
            const imgSrc = resolveMediaUrl(typeof img === "string" ? img : (img as any).url || img);
            const slotIndex = hasVideo ? idx + 1 : idx + 2;
            const roomLabel = DEFAULT_ROOM_TAGS[slotIndex] || "Property Photo";

            return (
              <div 
                key={idx} 
                className="relative h-full cursor-pointer group overflow-hidden rounded-xl border border-white/10"
                onClick={() => { setCurrentIndex(slotIndex); setIsOpen(true); }}
              >
                <Image
                  src={imgSrc}
                  alt={title}
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                
                {/* Room Name Tag Label */}
                <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md text-white font-bold text-[10px] px-2.5 py-1 rounded-md border border-white/10">
                  {roomLabel}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Floating Bar: Listing Photo Count & Action Buttons */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-20 pointer-events-none">
          
          {/* Photo Counter Badge (Left) */}
          <div className="bg-slate-950/85 backdrop-blur-md text-white px-3 py-1.5 rounded-full font-black text-[11px] sm:text-xs border border-white/20 flex items-center gap-1.5 shadow-xl pointer-events-auto shrink-0">
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">1/{images.length} - Listing Photos</span>
            <span className="sm:hidden">1/{images.length}</span>
          </div>

          {/* Action Buttons (Right) */}
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
            {hasVideo && (
              <Button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsVideoOpen(true); }}
                className="bg-white/95 hover:bg-white text-slate-950 backdrop-blur-md border border-white/40 font-black text-[11px] sm:text-xs rounded-full px-3.5 sm:px-4 py-1.5 sm:py-2 shadow-xl flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-red-600 text-red-600" />
                <span>Watch Tour</span>
              </Button>
            )}

            <Button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(0); setIsOpen(true); }}
              className="bg-slate-950/85 hover:bg-slate-900 text-white backdrop-blur-md border border-white/20 font-black text-[11px] sm:text-xs rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-xl flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            >
              <Grid2X2 className="w-3.5 h-3.5 text-amber-400" />
              <span>View All ({images.length})</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Fullscreen Photo Gallery Lightbox Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl p-0 bg-slate-950 border-slate-800 text-white overflow-hidden">
          <DialogTitle className="sr-only">{title} Photo Gallery</DialogTitle>
          <DialogDescription className="sr-only">Full screen gallery images for {title}</DialogDescription>

          <div className="relative h-[80vh] w-full flex items-center justify-center bg-black">
            <Image
              src={resolveMediaUrl(typeof images[currentIndex] === "string" ? (images[currentIndex] as any) : (images[currentIndex] as any).url || images[currentIndex])}
              alt={title}
              fill
              unoptimized
              className="object-contain"
            />

            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer shadow-lg"
              title="Back to property"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Property</span>
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/20 transition-all cursor-pointer shadow-lg"
              title="Close Image Gallery"
            >
              <X className="w-5 h-5" />
            </button>

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

      {/* Video Tour Dialog Modal (Supports YouTube & Direct Uploaded Videos) */}
      {hasVideo && (
        <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
          <DialogContent className={cn(
            "p-0 bg-slate-950 border-slate-800 text-white overflow-hidden rounded-3xl mx-auto shadow-2xl transition-all duration-300",
            isShort ? "max-w-[360px] sm:max-w-[420px] w-[92vw]" : "max-w-4xl w-full"
          )}>
            <DialogTitle className="p-3.5 bg-slate-900 border-b border-slate-800 font-extrabold text-xs sm:text-sm text-white flex items-center justify-between">
              <span className="flex items-center gap-2 truncate">
                <Play className="w-4 h-4 text-red-500 fill-red-500 shrink-0" />
                {embedUrl ? (isShort ? "YouTube Short Tour" : "Property Video Tour") : "Property Video Walkthrough"} - {title}
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">Video tour for {title}</DialogDescription>
            <div className={cn(
              "relative w-full bg-black flex items-center justify-center overflow-hidden",
              isShort ? "h-[70vh] sm:h-[75vh] max-h-[640px] aspect-[9/16]" : "aspect-video"
            )}>
              {embedUrl ? (
                <iframe
                  src={`${embedUrl}?autoplay=1`}
                  title={`${title} Video Tour`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={resolveMediaUrl(videoUrl)}
                  controls
                  autoPlay
                  poster={videoThumbnail ? resolveMediaUrl(videoThumbnail) : undefined}
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
