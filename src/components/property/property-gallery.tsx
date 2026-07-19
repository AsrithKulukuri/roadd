"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Grid2X2, Play } from "lucide-react";
import type { PropertyImage } from "@/types/property";

interface PropertyGalleryProps {
  images: PropertyImage[];
  title: string;
  videoUrl?: string;
}

export function PropertyGallery({ images, title, videoUrl }: PropertyGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const getYoutubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };
  const embedUrl = getYoutubeEmbedUrl(videoUrl);

  if (!images || images.length === 0) return null;

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[300px] md:h-[500px] rounded-3xl overflow-hidden relative">
        {/* Main Image */}
        <div 
          className="md:col-span-2 relative h-full cursor-pointer group"
          onClick={() => { setCurrentIndex(0); setIsOpen(true); }}
        >
          <Image
            src={images[0].url}
            alt={images[0].alt || title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            priority
          />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
        </div>

        {/* Small Images */}
        <div className="hidden md:grid col-span-2 grid-cols-2 grid-rows-2 gap-2 h-full">
          {images.slice(1, 5).map((img, idx) => (
            <div 
              key={img.id} 
              className="relative h-full cursor-pointer group"
              onClick={() => { setCurrentIndex(idx + 1); setIsOpen(true); }}
            >
              <Image
                src={img.url}
                alt={img.alt || title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
            </div>
          ))}
        </div>

        {/* View All Button */}
        <Button 
          variant="secondary" 
          className="absolute bottom-4 right-4 z-10 glass hover:bg-white/20 text-white border-white/30"
          onClick={() => { setCurrentIndex(0); setIsOpen(true); }}
        >
          <Grid2X2 className="w-4 h-4 mr-2" />
          View All {images.length} Photos
        </Button>

        {/* Watch Video Button */}
        {embedUrl && (
          <Button 
            variant="amber" 
            className="absolute bottom-4 left-4 z-10 shadow-amber-glow"
            onClick={() => setIsVideoOpen(true)}
          >
            <Play className="w-4 h-4 mr-2 fill-current" />
            Watch Property Tour
          </Button>
        )}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full p-0 bg-black/95 border-none flex flex-col">
          <DialogTitle className="sr-only">Property Images</DialogTitle>
          <DialogDescription className="sr-only">Fullscreen gallery view</DialogDescription>
          
          <div className="flex justify-between items-center p-4 text-white z-50">
            <span className="font-medium">{currentIndex + 1} / {images.length}</span>
          </div>

          <div className="relative flex-1 flex items-center justify-center p-4">
            <div className="relative w-full h-full">
              <Image
                src={images[currentIndex]?.url}
                alt={images[currentIndex]?.alt || title}
                fill
                className="object-contain"
              />
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full h-12 w-12"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full h-12 w-12"
              onClick={handleNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Modal */}
      <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 bg-black overflow-hidden border-none aspect-video">
          <DialogTitle className="sr-only">Property Video Tour</DialogTitle>
          <iframe 
            width="100%" 
            height="100%" 
            src={embedUrl || ""} 
            title="Property Video Tour" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen 
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
