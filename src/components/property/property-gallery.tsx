"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Layers, 
  X, 
  ArrowLeft
} from "lucide-react";
import type { PropertyImage } from "@/types/property";
import { getYoutubeEmbedUrl, isYoutubeShort, cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/aws/storage-utils";
import { ZoomableImageModal } from "@/components/ui/zoomable-image-modal";
import { WatermarkOverlay } from "@/components/shared/watermark-overlay";

interface PropertyGalleryProps {
  images: PropertyImage[];
  title: string;
  videoUrl?: string;
  videoThumbnail?: string;
  isReadyToMove?: boolean;
}

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
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const openVideoModal = () => {
    setIsVideoLoading(true);
    setIsVideoOpen(true);
  };

  const embedUrl = getYoutubeEmbedUrl(videoUrl);
  const isShort = isYoutubeShort(videoUrl);
  const hasVideo = Boolean(videoUrl && videoUrl.trim());

  if (!images || images.length === 0) return null;

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  // Main hero cover image
  const heroImageSrc = resolveMediaUrl(
    typeof images[0] === "string" ? images[0] : (images[0] as any).url || images[0]
  );

  // Video card thumbnail
  const videoCoverSrc = videoThumbnail 
    ? resolveMediaUrl(videoThumbnail) 
    : (images[1] ? resolveMediaUrl(typeof images[1] === "string" ? images[1] : (images[1] as any).url || images[1]) : heroImageSrc);

  // Secondary/Outdoors card image
  const secondaryImageSrc = images[hasVideo ? 1 : 1] 
    ? resolveMediaUrl(typeof images[hasVideo ? 1 : 1] === "string" ? images[hasVideo ? 1 : 1] : (images[hasVideo ? 1 : 1] as any).url || images[hasVideo ? 1 : 1])
    : (images[2] ? resolveMediaUrl(typeof images[2] === "string" ? images[2] : (images[2] as any).url || images[2]) : heroImageSrc);

  const totalMediaCount = images.length + (hasVideo ? 1 : 0);
  const outdoorsCount = Math.max(1, Math.floor(images.length * 0.4));

  return (
    <>
      {/* 2-Column Luxury 3-Card Grid (Exact Reference UI) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-3.5 h-[340px] sm:h-[400px] lg:h-[440px] select-none rounded-2xl">
        
        {/* LEFT HERO CARD: "All Photos & Videos" */}
        <div 
          className="md:col-span-2 relative h-full w-full rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-slate-950"
          onClick={() => { setCurrentIndex(0); setIsOpen(true); }}
        >
          <img
            src={heroImageSrc}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          {/* Bottom gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/70 transition-colors" />

          {/* Badge top-left */}
          <div className="absolute top-3.5 left-3.5 flex items-center gap-2 z-10">
            <span className="bg-slate-950 backdrop-blur-md text-white font-extrabold text-[11px] px-3 py-1 rounded-full border border-[#faad13] shadow-md">
              {isReadyToMove ? "Ready to Move" : "Under Construction"}
            </span>
          </div>

          {/* Bottom Right: Total media counter */}
          <div className="absolute bottom-3.5 right-4 flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white drop-shadow-md z-10 pointer-events-none bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15">
            <Layers className="w-4 h-4 text-white" />
            <span>{totalMediaCount}</span>
          </div>
        </div>

        {/* RIGHT COLUMN: 2 Stacked Cards (Videos + Gallery) */}
        <div className="hidden md:grid grid-rows-2 gap-3 sm:gap-3.5 h-full min-h-0">
          
          {/* TOP RIGHT CARD */}
          <div 
            className="relative h-full w-full rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-slate-950 min-h-0"
            onClick={() => {
              if (hasVideo) {
                openVideoModal();
              } else {
                setCurrentIndex(1 % images.length);
                setIsOpen(true);
              }
            }}
          >
            <img
              src={videoCoverSrc}
              alt={`${title} Videos`}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent group-hover:from-black/70 transition-colors" />

            {/* Centered Circular Translucent Play Button if video exists */}
            {hasVideo && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/95 hover:bg-white text-slate-950 flex items-center justify-center shadow-2xl backdrop-blur-md group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-slate-950 text-slate-950 ml-0.5" />
                </div>
              </div>
            )}

            {/* Bottom Right Badge */}
            <div className="absolute bottom-3 right-3.5 flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white drop-shadow-md z-10 pointer-events-none bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/15">
              <Layers className="w-3.5 h-3.5 text-white" />
              <span>{hasVideo ? 1 : 1}</span>
            </div>
          </div>

          {/* BOTTOM RIGHT CARD */}
          <div 
            className="relative h-full w-full rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-slate-950 min-h-0" 
            onClick={() => {
              setCurrentIndex(Math.min(2, images.length - 1));
              setIsOpen(true);
            }}
          >
            <img
              src={secondaryImageSrc}
              alt={`${title} Gallery`}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent group-hover:from-black/70 transition-colors" />

            {/* Bottom Right: Count */}
            <div className="absolute bottom-3 right-3.5 flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white drop-shadow-md z-10 pointer-events-none bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/15">
              <Layers className="w-3.5 h-3.5 text-white" />
              <span>{Math.max(1, images.length - (hasVideo ? 1 : 2))}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Fullscreen Photo Gallery Lightbox with Pinch-to-Zoom & Pan */}
      <ZoomableImageModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        images={images.map(img => ({
          url: typeof img === "string" ? img : img.url,
          label: typeof img === "string" ? title : img.alt || title,
        }))}
        initialIndex={currentIndex}
        title={title}
      />

      {/* Video Tour Dialog Modal (Supports YouTube & Direct Uploaded Videos) */}
      {hasVideo && (
        <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
          <DialogContent className="p-0 bg-slate-950 border border-white/15 text-white overflow-hidden rounded-3xl mx-auto shadow-2xl transition-all duration-300 max-w-5xl w-full h-[88vh] sm:h-[85vh] flex flex-col">
            <DialogTitle className="px-4 py-3 bg-slate-900 border-b border-white/10 font-extrabold text-xs sm:text-sm text-white flex items-center justify-between shrink-0">
              <span className="flex items-center gap-2 truncate">
                <Play className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                <span>Video Walkthrough - {title}</span>
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">Video tour for {title}</DialogDescription>
            <div className="relative flex-1 w-full h-full min-h-0 bg-black flex items-center justify-center overflow-hidden">
              {/* Buffering / Loading Overlay */}
              {isVideoLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md gap-3 pointer-events-none">
                  {videoThumbnail && (
                    <img
                      src={resolveMediaUrl(videoThumbnail)}
                      alt="Poster blur"
                      className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-md"
                    />
                  )}
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border-3 border-amber-500/20 border-t-amber-500 animate-spin" />
                      <Play className="w-5 h-5 text-amber-500 fill-amber-500 absolute" />
                    </div>
                    <p className="text-white font-bold text-xs sm:text-sm tracking-wider animate-pulse uppercase">
                      Loading Video Walkthrough...
                    </p>
                  </div>
                </div>
              )}

              {embedUrl ? (
                <iframe
                  src={`${embedUrl}?autoplay=1`}
                  title={`${title} Video Tour`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={() => setIsVideoLoading(false)}
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    src={resolveMediaUrl(videoUrl)}
                    controls
                    autoPlay
                    poster={videoThumbnail ? resolveMediaUrl(videoThumbnail) : undefined}
                    className="w-full h-full object-contain"
                    onLoadedData={() => setIsVideoLoading(false)}
                    onCanPlay={() => setIsVideoLoading(false)}
                  />
                  <WatermarkOverlay position="left-middle" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
