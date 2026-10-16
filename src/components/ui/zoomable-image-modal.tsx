"use client";

import { useState, useRef, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, ArrowLeft, LayoutTemplate, RefreshCw, AlertCircle } from "lucide-react";
import { resolveMediaUrl } from "@/lib/aws/storage-utils";

interface ZoomableImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: Array<{ url: string; label?: string; alt?: string } | string>;
  initialIndex?: number;
  title?: string;
}

export function ZoomableImageModal({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  title,
}: ZoomableImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageProgress, setImageProgress] = useState(15);
  const [hasImageError, setHasImageError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchDistanceRef = useRef<number | null>(null);
  const initialPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapTimeRef = useRef<number>(0);

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Sync initial index
  useEffect(() => {
    setCurrentIndex(initialIndex);
    resetZoom();
  }, [initialIndex, isOpen]);

  // Real-time progress simulation while downloading high-res image
  const currentItem = images[currentIndex];
  const currentUrl = typeof currentItem === "string" ? currentItem : currentItem?.url || "";
  const currentLabel = typeof currentItem === "string" ? title : currentItem?.label || currentItem?.alt || title;

  useEffect(() => {
    if (!isOpen || !currentUrl) return;

    setIsImageLoading(true);
    setHasImageError(false);
    setImageProgress(18);

    // If image is already cached by browser
    if (imageRef.current && imageRef.current.complete && imageRef.current.naturalWidth > 0) {
      setImageProgress(100);
      setIsImageLoading(false);
      return;
    }

    const interval = setInterval(() => {
      setImageProgress((prev) => {
        if (prev < 45) return prev + Math.floor(Math.random() * 8) + 6;
        if (prev < 78) return prev + Math.floor(Math.random() * 6) + 3;
        if (prev < 94) return prev + Math.floor(Math.random() * 2) + 1;
        return prev;
      });
    }, 110);

    return () => clearInterval(interval);
  }, [isOpen, currentUrl, currentIndex, reloadKey]);

  const handleImageLoad = () => {
    setImageProgress(100);
    setTimeout(() => {
      setIsImageLoading(false);
    }, 120);
  };

  const handleImageError = () => {
    setIsImageLoading(false);
    setHasImageError(true);
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    resetZoom();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    resetZoom();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  // Keyboard navigation & Esc
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && images.length > 1) handlePrev();
      if (e.key === "ArrowRight" && images.length > 1) handleNext();
      if (e.key === "+" || e.key === "=") handleZoomIn();
      if (e.key === "-") handleZoomOut();
      if (e.key === "0") resetZoom();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, images.length, onClose]);

  // ── Touch Events (Pinch-to-zoom & Double-tap) ──
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch started
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistanceRef.current = dist;
    } else if (e.touches.length === 1) {
      // Check for double tap
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        // Double tapped!
        if (scale > 1) {
          resetZoom();
        } else {
          setScale(2.5);
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const tapX = e.touches[0].clientX - rect.left - rect.width / 2;
            const tapY = e.touches[0].clientY - rect.top - rect.height / 2;
            setPosition({ x: -tapX * 1.2, y: -tapY * 1.2 });
          }
        }
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      // Start drag
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialPositionRef.current = { ...position };
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistanceRef.current !== null) {
      // Pinching
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / lastTouchDistanceRef.current;
      setScale((prev) => {
        const next = Math.min(Math.max(prev * ratio, 1), 4);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
      lastTouchDistanceRef.current = dist;
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Panning while zoomed
      const deltaX = e.touches[0].clientX - touchStartRef.current.x;
      const deltaY = e.touches[0].clientY - touchStartRef.current.y;
      
      const maxPanX = (window.innerWidth * (scale - 1)) / 2;
      const maxPanY = (window.innerHeight * (scale - 1)) / 2;

      setPosition({
        x: Math.max(Math.min(initialPositionRef.current.x + deltaX, maxPanX), -maxPanX),
        y: Math.max(Math.min(initialPositionRef.current.y + deltaY, maxPanY), -maxPanY),
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      lastTouchDistanceRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
      // Snap back if scale is 1
      if (scale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  // ── Mouse Drag (Desktop) ──
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      touchStartRef.current = { x: e.clientX, y: e.clientY };
      initialPositionRef.current = { ...position };
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      e.preventDefault();
      const deltaX = e.clientX - touchStartRef.current.x;
      const deltaY = e.clientY - touchStartRef.current.y;

      const maxPanX = (window.innerWidth * (scale - 1)) / 2;
      const maxPanY = (window.innerHeight * (scale - 1)) / 2;

      setPosition({
        x: Math.max(Math.min(initialPositionRef.current.x + deltaX, maxPanX), -maxPanX),
        y: Math.max(Math.min(initialPositionRef.current.y + deltaY, maxPanY), -maxPanY),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.25, 4));
    } else {
      setScale((prev) => {
        const next = Math.max(prev - 0.25, 1);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  if (!isOpen || !currentUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-md flex flex-col justify-between select-none touch-none"
      onMouseUp={handleMouseUp}
    >
      {/* Top Bar */}
      <div className="relative z-30 flex items-center justify-between p-3.5 sm:p-5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-white hover:text-slate-950 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer shadow-lg active:scale-95"
            title="Close image"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Close</span>
          </button>

          {currentLabel && (
            <span className="text-xs sm:text-sm font-bold text-white/90 truncate max-w-[200px] sm:max-w-md drop-shadow-md">
              {currentLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {images.length > 1 && (
            <span className="px-3 py-1 rounded-full bg-slate-900/80 text-white text-xs font-bold border border-white/15">
              {currentIndex + 1} / {images.length}
            </span>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/20 transition-all cursor-pointer shadow-lg active:scale-95"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-Time Loading Bar on Modal Header */}
        {isImageLoading && (
          <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/10 overflow-hidden pointer-events-none">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 shadow-[0_0_12px_#f59e0b] transition-all duration-150 ease-out"
              style={{ width: `${Math.min(100, imageProgress)}%` }}
            />
          </div>
        )}
      </div>

      {/* Main Image Canvas */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
      >
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 sm:left-6 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-white hover:text-slate-950 text-white border border-white/20 transition-all cursor-pointer shadow-xl active:scale-95"
              title="Previous image"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 sm:right-6 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-white hover:text-slate-950 text-white border border-white/20 transition-all cursor-pointer shadow-xl active:scale-95"
              title="Next image"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Real-Time Central Loading Progress Box */}
        {isImageLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none p-4">
            <div className="bg-slate-950/90 border border-white/15 rounded-3xl p-6 sm:p-7 flex flex-col items-center gap-4 max-w-sm w-full shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
              <div className="relative flex items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-inner">
                  <LayoutTemplate className="w-7 h-7 text-amber-400 animate-pulse" />
                </div>
                <div className="absolute -inset-1 rounded-2xl border-2 border-dashed border-amber-400/40 animate-spin [animation-duration:3.5s]" />
              </div>

              <div className="flex flex-col items-center text-center gap-1">
                <div className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                  <span>Loading Full Plan</span>
                  <span className="text-amber-400 font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 shadow-xs">
                    {Math.round(imageProgress)}%
                  </span>
                </div>
                <p className="text-slate-400 text-xs">
                  Downloading high-resolution blueprint layout...
                </p>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full shadow-[0_0_12px_#f59e0b] transition-all duration-150 ease-out"
                  style={{ width: `${Math.min(100, imageProgress)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error Fallback */}
        {hasImageError && !isImageLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 p-4">
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 flex flex-col items-center gap-3 text-center max-w-sm">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm font-semibold text-white">Could not load image</p>
              <button
                onClick={() => {
                  setReloadKey((k) => k + 1);
                  setIsImageLoading(true);
                  setHasImageError(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        )}

        {/* Zoomable Image Element */}
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            transformOrigin: "center center",
          }}
          className="max-w-full max-h-full flex items-center justify-center pointer-events-none"
        >
          <img
            ref={imageRef}
            key={`${currentUrl}-${reloadKey}`}
            src={resolveMediaUrl(currentUrl)}
            alt={currentLabel || "Zoomable view"}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={`max-h-[75vh] sm:max-h-[82vh] max-w-[95vw] object-contain rounded-lg shadow-2xl drop-shadow-2xl transition-all duration-300 ${
              isImageLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
            }`}
            draggable={false}
          />
        </div>

        {/* Floating Hint Overlay on mobile */}
        {scale === 1 && !isImageLoading && (
          <div className="absolute bottom-20 sm:bottom-24 pointer-events-none px-3.5 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md text-white/80 text-[11px] font-semibold border border-white/10 shadow-lg animate-fade-in">
            <span>Pinch or double tap to zoom in</span>
          </div>
        )}
      </div>

      {/* Bottom Floating Zoom Controls Bar */}
      <div className="relative z-30 pb-5 sm:pb-6 flex items-center justify-center gap-2">
        <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-white/20 shadow-2xl">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="p-2 rounded-full text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer active:scale-95"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={resetZoom}
            className="px-3 py-1 rounded-full text-xs font-mono font-bold text-white hover:bg-white/20 transition-all cursor-pointer"
            title="Reset Zoom (0)"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={handleZoomIn}
            disabled={scale >= 4}
            className="p-2 rounded-full text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer active:scale-95"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {scale > 1 && (
            <button
              onClick={resetZoom}
              className="p-2 rounded-full text-amber-400 hover:bg-white/20 transition-all cursor-pointer active:scale-95"
              title="Reset to 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
