"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { resolveMediaUrl } from "@/lib/aws/storage-utils";

export interface GalleryImageItem {
  url: string;
  label?: string;
  alt?: string;
  thumbnailUrl?: string;
}

export interface ZoomableImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: Array<GalleryImageItem | string>;
  initialIndex?: number;
  title?: string;
}

// Bounded LRU-style cache of preloaded/decoded URLs (max 36 items to protect mobile memory)
const MAX_LOADED_CACHE = 36;
const loadedCache = new Set<string>();

function markUrlLoaded(url: string) {
  if (!url) return;
  if (loadedCache.size >= MAX_LOADED_CACHE) {
    const oldest = loadedCache.values().next().value;
    if (oldest) loadedCache.delete(oldest);
  }
  loadedCache.add(url);
}

function isUrlLoaded(url: string): boolean {
  if (!url) return false;
  return loadedCache.has(url);
}

// Check if a URL points to a PDF document rather than a raster image
function isPdfUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return clean.endsWith(".pdf");
}

// Set of in-flight background preload requests to prevent duplicate downloads
const activePreloadUrls = new Set<string>();

function preloadImage(rawUrl: string): Promise<boolean> {
  if (!rawUrl || isPdfUrl(rawUrl)) return Promise.resolve(true);

  const resolved = resolveMediaUrl(rawUrl);
  if (isUrlLoaded(rawUrl) || isUrlLoaded(resolved) || activePreloadUrls.has(resolved)) {
    return Promise.resolve(true);
  }

  activePreloadUrls.add(resolved);

  return new Promise((resolve) => {
    const img = new Image();
    img.src = resolved;

    const onComplete = (success: boolean) => {
      activePreloadUrls.delete(resolved);
      if (success) {
        markUrlLoaded(rawUrl);
        markUrlLoaded(resolved);
      }
      resolve(success);
    };

    if (img.complete && img.naturalWidth > 0) {
      onComplete(true);
    } else {
      img.onload = () => onComplete(true);
      img.onerror = () => onComplete(false);
    }
  });
}

export function ZoomableImageModal({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  title,
}: ZoomableImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // displayedIndex keeps the currently visible image on screen while the next one downloads
  const [displayedIndex, setDisplayedIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const requestIdRef = useRef<number>(0);

  // Touch tracking for pinch-to-zoom, pan, and horizontal swipe
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const touchCurrentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchDistanceRef = useRef<number | null>(null);
  const initialPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapTimeRef = useRef<number>(0);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const [prevInitialIndex, setPrevInitialIndex] = useState(initialIndex);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Sync state during render when isOpen or initialIndex changes
  if (prevIsOpen !== isOpen || prevInitialIndex !== initialIndex) {
    setPrevIsOpen(isOpen);
    setPrevInitialIndex(initialIndex);
    if (isOpen) {
      const validIndex = Math.max(0, Math.min(initialIndex, Math.max(0, images.length - 1)));
      setCurrentIndex(validIndex);
      setDisplayedIndex(validIndex);
      setHasError(false);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }

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

  // Helper to extract URL and metadata
  const getItemData = useCallback(
    (index: number) => {
      const item = images[index];
      if (!item) return { url: "", label: title, alt: title, thumbnailUrl: "" };
      if (typeof item === "string") {
        return { url: item, label: title, alt: title, thumbnailUrl: "" };
      }
      return {
        url: item.url || "",
        label: item.label || item.alt || title,
        alt: item.alt || item.label || title,
        thumbnailUrl: item.thumbnailUrl || "",
      };
    },
    [images, title]
  );

  const currentItem = getItemData(currentIndex);
  const displayedItem = getItemData(displayedIndex);

  const currentUrl = currentItem.url;
  const currentLabel = currentItem.label;
  const displayedUrl = displayedItem.url;
  const displayedLabel = displayedItem.label;
  const isCurrentPdf = isPdfUrl(currentUrl);

  // Instant render-time switch for PDFs or already cached assets (zero blank frame)
  const resolvedCurrentUrl = currentUrl ? resolveMediaUrl(currentUrl) : "";
  const isTargetCached = Boolean(currentUrl && (isUrlLoaded(currentUrl) || isUrlLoaded(resolvedCurrentUrl)));

  if ((isCurrentPdf || isTargetCached) && displayedIndex !== currentIndex) {
    setDisplayedIndex(currentIndex);
    setHasError(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }

  // Derived loading state: true when target image is uncached and actively downloading
  const isTargetLoading = Boolean(
    isOpen &&
    currentUrl &&
    !isCurrentPdf &&
    !isTargetCached &&
    !hasError
  );

  // Transition controller: Load incoming uncached image in background while keeping current image visible
  useEffect(() => {
    if (!isOpen || !currentUrl || isCurrentPdf) return;

    const resolved = resolveMediaUrl(currentUrl);
    if (isUrlLoaded(currentUrl) || isUrlLoaded(resolved)) {
      return;
    }

    // Otherwise, start loading target in the background
    requestIdRef.current += 1;
    const thisRequestId = requestIdRef.current;

    const img = new Image();
    img.src = resolved;

    const handleReady = () => {
      // Discard if user navigated away to another image in the meantime
      if (requestIdRef.current !== thisRequestId) return;

      markUrlLoaded(currentUrl);
      markUrlLoaded(resolved);
      setDisplayedIndex(currentIndex);
      setHasError(false);
      resetZoom();
    };

    if (img.complete && img.naturalWidth > 0) {
      handleReady();
    } else {
      img.onload = () => {
        if ("decode" in img) {
          img.decode().then(handleReady).catch(handleReady);
        } else {
          handleReady();
        }
      };
      img.onerror = () => {
        if (requestIdRef.current !== thisRequestId) return;
        setHasError(true);
      };
    }
  }, [currentIndex, currentUrl, displayedIndex, isCurrentPdf, isOpen, reloadKey, resetZoom]);

  // Intelligent Adjacent Preloading: preload next (+1) and previous (-1) images into browser cache
  useEffect(() => {
    if (!isOpen || images.length <= 1) return;

    const nextIndex = (currentIndex + 1) % images.length;
    const prevIndex = (currentIndex - 1 + images.length) % images.length;

    const nextUrl = getItemData(nextIndex).url;
    const prevUrl = getItemData(prevIndex).url;

    // Small delay ensures current image receives immediate network priority
    const timer = setTimeout(() => {
      if (nextUrl) preloadImage(nextUrl);
      if (prevUrl) preloadImage(prevUrl);
    }, 80);

    return () => clearTimeout(timer);
  }, [currentIndex, isOpen, images.length, getItemData]);

  // Navigation handlers
  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (images.length <= 1) return;
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    },
    [images.length]
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (images.length <= 1) return;
      setCurrentIndex((prev) => (prev + 1) % images.length);
    },
    [images.length]
  );

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

  const handleRetry = () => {
    setHasError(false);
    setReloadKey((k) => k + 1);
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
  }, [isOpen, images.length, onClose, handlePrev, handleNext, resetZoom]);

  // ── Touch Events (Pinch-to-zoom, Pan, and Horizontal Swipe Navigation) ──
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch started
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistanceRef.current = dist;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      // Double tap detection
      if (now - lastTapTimeRef.current < 300) {
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

      // Start drag / swipe tracking
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: now };
      touchCurrentRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
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
    } else if (e.touches.length === 1) {
      touchCurrentRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      if (isDragging && scale > 1) {
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
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      lastTouchDistanceRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);

      if (scale <= 1) {
        setPosition({ x: 0, y: 0 });

        // Horizontal swipe gesture detection on mobile
        const deltaX = touchCurrentRef.current.x - touchStartRef.current.x;
        const deltaY = touchCurrentRef.current.y - touchStartRef.current.y;
        const elapsed = Date.now() - touchStartRef.current.time;

        if (
          Math.abs(deltaX) > 45 &&
          Math.abs(deltaX) > Math.abs(deltaY) * 1.2 &&
          elapsed < 600 &&
          images.length > 1
        ) {
          if (deltaX < 0) {
            handleNext();
          } else {
            handlePrev();
          }
        }
      }
    }
  };

  // ── Mouse Drag (Desktop Panning) ──
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
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

  if (!isOpen) return null;

  const activeRenderUrl = displayedUrl || currentUrl;
  const activeRenderLabel = displayedLabel || currentLabel;
  const activeThumbnail = displayedItem.thumbnailUrl || currentItem.thumbnailUrl;

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

        {/* Subtle, Non-blocking Header Loading Shimmer Line */}
        {isTargetLoading && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 overflow-hidden pointer-events-none">
            <div className="h-full bg-gradient-to-r from-transparent via-amber-400 to-transparent w-full animate-pulse" />
          </div>
        )}
      </div>

      {/* Subtle Corner Loading Pill (Non-blocking) */}
      {isTargetLoading && (
        <div className="absolute top-16 right-4 sm:right-6 pointer-events-none z-30 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 text-white/80 text-[11px] font-medium shadow-lg animate-in fade-in duration-150">
          <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
          <span>Loading...</span>
        </div>
      )}

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
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 sm:right-6 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-white hover:text-slate-950 text-white border border-white/20 transition-all cursor-pointer shadow-xl active:scale-95"
              title="Next image"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Compact, Non-blocking Error / Retry Banner */}
        {hasError && (
          <div className="absolute bottom-24 z-20 flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 backdrop-blur-md border border-red-500/30 text-white text-xs shadow-xl animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>Could not load image</span>
            <button
              onClick={handleRetry}
              className="ml-1.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer transition-all active:scale-95"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* PDF Document Viewer (if the asset is a blueprint/layout PDF) */}
        {isCurrentPdf ? (
          <div className="w-full h-full max-w-5xl max-h-[82vh] flex flex-col items-center justify-center p-3 sm:p-6 z-10">
            <iframe
              src={resolveMediaUrl(currentUrl)}
              className="w-full h-full rounded-2xl border border-white/15 bg-slate-900 shadow-2xl"
              title={currentLabel || "Document viewer"}
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={resolveMediaUrl(currentUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Document</span>
              </a>
            </div>
          </div>
        ) : (
          /* Zoomable & Pannable Image Element */
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              transformOrigin: "center center",
            }}
            className="max-w-full max-h-full flex items-center justify-center pointer-events-none"
          >
            {/* Low-res Thumbnail / Placeholder (Smooth progressive upgrade for floor plans) */}
            {activeThumbnail && isTargetLoading && (
              <img
                src={resolveMediaUrl(activeThumbnail)}
                alt="Preview"
                className="absolute max-h-[75vh] sm:max-h-[82vh] max-w-[95vw] object-contain rounded-lg filter blur-[1.5px] opacity-80"
                draggable={false}
              />
            )}

            {activeRenderUrl && (
              <img
                ref={imageRef}
                key={`${activeRenderUrl}-${reloadKey}`}
                src={resolveMediaUrl(activeRenderUrl)}
                alt={activeRenderLabel || "Gallery view"}
                className="max-h-[75vh] sm:max-h-[82vh] max-w-[95vw] object-contain rounded-lg shadow-2xl drop-shadow-2xl transition-opacity duration-200 select-none"
                style={{ imageRendering: "auto" }}
                draggable={false}
              />
            )}
          </div>
        )}

        {/* Floating Hint Overlay on mobile */}
        {scale === 1 && !isTargetLoading && !isCurrentPdf && (
          <div className="absolute bottom-20 sm:bottom-24 pointer-events-none px-3.5 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md text-white/80 text-[11px] font-semibold border border-white/10 shadow-lg animate-in fade-in duration-300">
            <span>Pinch or double tap to zoom · Swipe to navigate</span>
          </div>
        )}
      </div>

      {/* Bottom Floating Zoom Controls Bar */}
      {!isCurrentPdf && (
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
      )}
    </div>
  );
}
