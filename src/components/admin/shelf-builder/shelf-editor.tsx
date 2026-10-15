"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Save,
  Send,
  Eye,
  Sliders,
  Sparkles,
  LayoutGrid,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  Pin,
  Trash2,
  Plus,
  MoveUp,
  MoveDown,
  Layers,
  ArrowRight,
  Split,
  Settings,
  Filter,
  Repeat,
  Gauge,
  Play,
  Pause,
  Columns,
  Navigation,
} from "lucide-react";
import type {
  ShelfDefinition,
  ShelfListingItem,
  CardElementId,
  ElementConfig,
  BorderConfig,
  ImageArrangementPreset,
  ImageSplitRatio,
  ContentSourceType,
  CarouselLoopMode,
  CarouselTransitionSpeed,
  CarouselArrowPosition,
} from "@/types/shelf-builder";
import type { HomeCardStyleId, HomeCardSize } from "@/types/home-section";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";
import type { MixedItem } from "@/components/home/mixed-carousel-row";
import { ShelfCard } from "@/components/home/shelves/shelf-card";
import { ElementInspector } from "./element-inspector";
import { evaluateShelfFilters } from "@/lib/shelf-builder-defaults";
import { borderConfigToStyles } from "@/lib/shelf-builder-styles";
import { cn } from "@/lib/utils";

interface ShelfEditorProps {
  shelf: ShelfDefinition;
  onSaveDraft: (updatedShelf: ShelfDefinition) => Promise<void>;
  onPublish: (updatedShelf: ShelfDefinition) => Promise<void>;
  onBack: () => void;
  allProperties: Property[];
  allProjects: Project[];
}

export function ShelfEditor({
  shelf: initialShelf,
  onSaveDraft,
  onPublish,
  onBack,
  allProperties,
  allProjects,
}: ShelfEditorProps) {
  // Undo/Redo State History
  const [history, setHistory] = useState<ShelfDefinition[]>([initialShelf]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentShelf = history[historyIndex] || initialShelf;

  const pushState = useCallback(
    (newShelf: ShelfDefinition) => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(newShelf);
        return next;
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const updateShelf = (updates: Partial<ShelfDefinition>) => {
    const updated = {
      ...currentShelf,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    pushState(updated);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
    }
  };

  // Preview & Workspace Controls
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [itemTypeView, setItemTypeView] = useState<"all" | "property" | "project">("all");
  const [leftTab, setLeftTab] = useState<"settings" | "carousel" | "style" | "images" | "content">("settings");
  const [carouselDeviceTab, setCarouselDeviceTab] = useState<"desktop" | "mobile">("desktop");
  const [selectedElementId, setSelectedElementId] = useState<CardElementId>("container");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Live Canvas Preview Carousel Scroller
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const handlePreviewScroll = (direction: "left" | "right") => {
    const container = previewScrollRef.current;
    if (!container) return;
    const firstCard = container.firstElementChild as HTMLElement | null;
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width + 16 : 300;
    container.scrollBy({ left: direction === "right" ? cardWidth : -cardWidth, behavior: "smooth" });
  };

  // Save / Publish State
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Manual Listing Search
  const [searchQuery, setSearchQuery] = useState("");

  const triggerToast = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Evaluate Listings for Live Preview & Merge Live Overrides
  // ─────────────────────────────────────────────────────────────────────────────
  const previewItems = useMemo<MixedItem[]>(() => {
    const propertyMap = new Map(allProperties.map((p) => [p.id, p]));
    const projectMap = new Map(allProjects.map((p) => [p.id, p]));

    const manualListings: MixedItem[] = (currentShelf.items || []).flatMap((item: any): MixedItem[] => {
      if (item.type === "property") {
        const p = propertyMap.get(item.id);
        return p ? [{ ...p, itemType: "property" as const, ...item }] : [];
      }
      const pr = projectMap.get(item.id);
      return pr ? [{ ...pr, itemType: "project" as const, ...item }] : [];
    });

    let combined: MixedItem[] = manualListings;

    if (currentShelf.contentSource === "automatic" || (currentShelf.contentSource === "hybrid" && currentShelf.autoFilters)) {
      const autoMatches = evaluateShelfFilters(currentShelf, allProperties, allProjects);
      if (currentShelf.contentSource === "automatic") {
        combined = autoMatches.length > 0 ? autoMatches : manualListings;
      } else {
        const manualIds = new Set(manualListings.map((m: MixedItem) => m.id));
        const rest = autoMatches.filter((m: MixedItem) => !manualIds.has(m.id));
        combined = [...manualListings, ...rest].slice(0, currentShelf.maxItems || 10);
      }
    }

    // Merge custom overrides from currentShelf.items so edits reflect instantly
    const overridesMap = new Map((currentShelf.items || []).map((it) => [it.id, it]));
    const mergedCombined = combined.map((item) => {
      const override = overridesMap.get(item.id);
      return override ? { ...item, ...override } : item;
    });

    // Filter by itemTypeView
    if (itemTypeView === "property") {
      return mergedCombined.filter((i: MixedItem) => i.itemType === "property");
    }
    if (itemTypeView === "project") {
      return mergedCombined.filter((i: MixedItem) => i.itemType === "project");
    }
    return mergedCombined;
  }, [currentShelf, allProperties, allProjects, itemTypeView]);

  // Active Item currently targeted for editing
  const activeItem = useMemo(() => {
    if (previewItems.length === 0) return null;
    if (!selectedItemId) return previewItems[0];
    return previewItems.find((p) => p.id === selectedItemId) || previewItems[0];
  }, [previewItems, selectedItemId]);

  // Update item field live in currentShelf.items
  const handleUpdateItemContent = (itemId: string, field: keyof ShelfListingItem, value: any) => {
    const existingIndex = (currentShelf.items || []).findIndex((i) => i.id === itemId);
    let updatedItems: ShelfListingItem[];
    if (existingIndex >= 0) {
      updatedItems = currentShelf.items.map((it, idx) =>
        idx === existingIndex ? { ...it, [field]: value } : it
      );
    } else {
      const match = previewItems.find((p) => p.id === itemId);
      updatedItems = [
        ...(currentShelf.items || []),
        {
          id: itemId,
          type: match?.itemType || "property",
          [field]: value,
        },
      ];
    }
    updateShelf({ items: updatedItems });
  };

  // Bulk apply styling or content to all items in current shelf
  const handleApplyToAllCards = (field: keyof ShelfListingItem, value: any) => {
    const allIds = new Set([
      ...(currentShelf.items || []).map((it) => it.id),
      ...previewItems.map((p) => p.id),
    ]);
    const updatedItems = Array.from(allIds).map((id) => {
      const existing = (currentShelf.items || []).find((it) => it.id === id);
      const match = previewItems.find((p) => p.id === id);
      return {
        ...(existing || { id, type: match?.itemType || "property" }),
        [field]: value,
      };
    });
    updateShelf({ items: updatedItems });
  };

  // Handle Save Draft
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSaveDraft(currentShelf);
      triggerToast("Draft saved successfully to backend!", "success");
    } catch (err: any) {
      triggerToast(err.message || "Failed to save draft", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Publish Changes
  const handleConfirmPublish = async () => {
    try {
      setIsPublishing(true);
      await onPublish(currentShelf);
      setShowPublishModal(false);
      triggerToast("Published successfully to live homepage!", "success");
    } catch (err: any) {
      triggerToast(err.message || "Failed to publish changes", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  // Apply card border to all cards in this shelf
  const handleApplyBorderToAllCards = (border: BorderConfig) => {
    const updatedItems = (currentShelf.items || []).map((item) => ({
      ...item,
      cardBorder: border,
    }));
    updateShelf({
      cardBorder: border,
      items: updatedItems,
    });
  };

  // Add listing to shelf
  const handleAddListing = (item: Property | Project, type: "property" | "project") => {
    const exists = currentShelf.items.some((i) => i.id === item.id);
    if (exists) {
      triggerToast("Listing is already in this shelf", "error");
      return;
    }
    const updatedItems = [
      ...currentShelf.items,
      {
        id: item.id,
        type,
        isPinned: false,
      },
    ];
    updateShelf({ items: updatedItems });
    triggerToast(`Added ${'title' in item ? item.title : item.name} to shelf`);
  };

  // Remove listing from shelf
  const handleRemoveListing = (id: string) => {
    const updated = currentShelf.items.filter((i) => i.id !== id);
    updateShelf({ items: updated });
  };

  // Toggle pinned state
  const handleTogglePin = (id: string) => {
    const updated = currentShelf.items.map((i) => {
      if (i.id === id) return { ...i, isPinned: !i.isPinned };
      return i;
    });
    updateShelf({ items: updated });
  };

  // Move listing up or down
  const handleMoveListing = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentShelf.items.length) return;
    const items = [...currentShelf.items];
    const [moved] = items.splice(index, 1);
    items.splice(newIndex, 0, moved);
    updateShelf({ items });
  };

  const CARD_STYLES: { id: HomeCardStyleId; name: string; desc: string }[] = [
    { id: "classic-default", name: "1. Classic Default", desc: "Balanced landscape, overlay badges & specs" },
    { id: "compact-marketplace", name: "2. Compact Marketplace", desc: "Horizontal split card for high density" },
    { id: "tall-portrait", name: "3. Tall Luxury Portrait", desc: "Cinematic portrait with luxury specs" },
    { id: "luxury-banner", name: "4. Luxury Banner", desc: "Extra wide panoramic banner with developer logo" },
    { id: "split-feature", name: "5. Split Feature Showcase", desc: "Dual stacked images with amenities grid" },
    { id: "bottom-floating", name: "6. Bottom Floating Card", desc: "Overlapping floating card with logo badge" },
    { id: "modern-villa", name: "7. Modern Villa Showcase", desc: "Gated villa photo with 3-amenity icons" },
    { id: "construction-progress", name: "8. Construction Tracker", desc: "Completion percentage bar & updates" },
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TOP WORKSPACE NAVIGATION & CONTROLS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Overview</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-white truncate max-w-[200px] sm:max-w-[300px]">
              {currentShelf.name || "Untitled Shelf"}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                currentShelf.status === "published"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : currentShelf.status === "draft"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-slate-700 text-slate-400"
              )}
            >
              {currentShelf.status}
            </span>
          </div>
        </div>

        {/* Center: Device Switcher & Undo/Redo */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setDeviceMode("desktop");
                setCarouselDeviceTab("desktop");
              }}
              title="Desktop Preview (1200px)"
              className={cn(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                deviceMode === "desktop" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              )}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode("tablet")}
              title="Tablet Preview (768px)"
              className={cn(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                deviceMode === "tablet" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              )}
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setDeviceMode("mobile");
                setCarouselDeviceTab("mobile");
              }}
              title="Mobile Preview (375px)"
              className={cn(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                deviceMode === "mobile" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              )}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex === 0}
              title="Undo change"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo change"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>{isSaving ? "Saving..." : "Save Draft"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPublishModal(true)}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish</span>
          </button>
        </div>
      </header>

      {/* Notification Banner */}
      {notification && (
        <div
          className={cn(
            "py-2 px-4 text-xs font-bold text-center transition-all z-20 flex items-center justify-center gap-1.5",
            notification.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          )}
        >
          {notification.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* THREE-PANEL VISUAL WORKSPACE */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ───────────────────────────────────────────────────────────────── */}
        {/* LEFT PANEL: Shelf Settings & Content Controls */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <aside className="w-80 md:w-96 border-r border-slate-800 bg-slate-900 flex flex-col shrink-0 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950 text-xs font-bold">
            <button
              type="button"
              onClick={() => setLeftTab("settings")}
              className={cn(
                "flex-1 py-2.5 text-center transition-colors border-b-2",
                leftTab === "settings"
                  ? "border-amber-500 text-amber-400 bg-amber-500/5"
                  : "border-transparent text-slate-400 hover:text-white"
              )}
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("carousel")}
              className={cn(
                "flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1",
                leftTab === "carousel"
                  ? "border-amber-500 text-amber-400 bg-amber-500/5"
                  : "border-transparent text-slate-400 hover:text-white"
              )}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Carousel</span>
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("style")}
              className={cn(
                "flex-1 py-2.5 text-center transition-colors border-b-2",
                leftTab === "style"
                  ? "border-amber-500 text-amber-400 bg-amber-500/5"
                  : "border-transparent text-slate-400 hover:text-white"
              )}
            >
              Card Style
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("images")}
              className={cn(
                "flex-1 py-2.5 text-center transition-colors border-b-2",
                leftTab === "images"
                  ? "border-amber-500 text-amber-400 bg-amber-500/5"
                  : "border-transparent text-slate-400 hover:text-white"
              )}
            >
              Images
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("content")}
              className={cn(
                "flex-1 py-2.5 text-center transition-colors border-b-2",
                leftTab === "content"
                  ? "border-amber-500 text-amber-400 bg-amber-500/5"
                  : "border-transparent text-slate-400 hover:text-white"
              )}
            >
              Listings ({currentShelf.items?.length || 0})
            </button>
          </div>

          {/* Left Tab Contents */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-300">
            {/* 1. SETTINGS TAB */}
            {leftTab === "settings" && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Internal Shelf Name
                  </label>
                  <input
                    type="text"
                    value={currentShelf.name}
                    onChange={(e) => updateShelf({ name: e.target.value })}
                    className="w-full py-1.5 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Public Shelf Heading
                  </label>
                  <input
                    type="text"
                    value={currentShelf.title}
                    onChange={(e) => updateShelf({ title: e.target.value })}
                    className="w-full py-1.5 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Eyebrow / Category Tag
                  </label>
                  <input
                    type="text"
                    value={currentShelf.eyebrow || ""}
                    onChange={(e) => updateShelf({ eyebrow: e.target.value })}
                    placeholder="e.g. EXCLUSIVE SELECTION, TRENDING NOW"
                    className="w-full py-1.5 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Subtitle / Description
                  </label>
                  <input
                    type="text"
                    value={currentShelf.subtitle || ""}
                    onChange={(e) => updateShelf({ subtitle: e.target.value })}
                    placeholder="e.g. Hand-picked luxury high-rises"
                    className="w-full py-1.5 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white"
                  />
                </div>

                {/* Heading & Subtitle Colors */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Heading Color</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={currentShelf.headingColor || "#ffffff"}
                        onChange={(e) => updateShelf({ headingColor: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                      />
                      <input
                        type="text"
                        value={currentShelf.headingColor || "#ffffff"}
                        onChange={(e) => updateShelf({ headingColor: e.target.value })}
                        className="w-full py-0.5 px-1.5 border border-slate-700 rounded bg-slate-800 font-mono text-[11px] uppercase text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Subtitle Color</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={currentShelf.subtitleColor || "#94a3b8"}
                        onChange={(e) => updateShelf({ subtitleColor: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                      />
                      <input
                        type="text"
                        value={currentShelf.subtitleColor || "#94a3b8"}
                        onChange={(e) => updateShelf({ subtitleColor: e.target.value })}
                        className="w-full py-0.5 px-1.5 border border-slate-700 rounded bg-slate-800 font-mono text-[11px] uppercase text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Heading Alignment</label>
                    <select
                      value={currentShelf.headingAlignment || "left"}
                      onChange={(e) => updateShelf({ headingAlignment: e.target.value as any })}
                      className="w-full py-1.5 px-2 rounded-lg border border-slate-700 bg-slate-800 text-white"
                    >
                      <option value="left">Left Aligned</option>
                      <option value="center">Centered</option>
                      <option value="right">Right Aligned</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Heading Size</label>
                    <select
                      value={currentShelf.headingSize || "text-xl"}
                      onChange={(e) => updateShelf({ headingSize: e.target.value as any })}
                      className="w-full py-1.5 px-2 rounded-lg border border-slate-700 bg-slate-800 text-white"
                    >
                      <option value="text-base">Small</option>
                      <option value="text-lg">Medium</option>
                      <option value="text-xl">Large (Default)</option>
                      <option value="text-2xl">Extra Large</option>
                      <option value="text-3xl">Display Hero</option>
                    </select>
                  </div>
                </div>

                {/* Section Background Color */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Shelf Background Color</span>
                    <button
                      type="button"
                      onClick={() => updateShelf({ sectionBgColor: undefined })}
                      className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                    >
                      Reset to Transparent
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentShelf.sectionBgColor && currentShelf.sectionBgColor !== "transparent" ? currentShelf.sectionBgColor : "#090d16"}
                      onChange={(e) => updateShelf({ sectionBgColor: e.target.value })}
                      className="w-7 h-7 rounded border-0 p-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={currentShelf.sectionBgColor || "transparent"}
                      onChange={(e) => updateShelf({ sectionBgColor: e.target.value })}
                      placeholder="e.g. #090d16 or transparent"
                      className="flex-1 py-1 px-2 border border-slate-700 rounded bg-slate-800 font-mono text-xs uppercase text-white"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { label: "Transparent", val: "transparent" },
                      { label: "Slate 950", val: "#020617" },
                      { label: "Slate 900", val: "#0f172a" },
                      { label: "Midnight", val: "#0b1329" },
                      { label: "Charcoal", val: "#1e293b" },
                      { label: "Pure Black", val: "#000000" },
                      { label: "Soft Cream", val: "#faf8f5" },
                      { label: "Clean White", val: "#ffffff" },
                    ].map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => updateShelf({ sectionBgColor: c.val })}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer",
                          currentShelf.sectionBgColor === c.val
                            ? "bg-amber-500 text-slate-950 border-amber-400"
                            : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500"
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section Padding & Spacing */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                  <span className="font-bold text-white block">Section Spacing</span>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Padding Top</span>
                        <span className="font-mono text-white font-bold">{currentShelf.sectionPaddingTop ?? 8}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={120}
                        value={currentShelf.sectionPaddingTop ?? 8}
                        onChange={(e) => updateShelf({ sectionPaddingTop: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Padding Bottom</span>
                        <span className="font-mono text-white font-bold">{currentShelf.sectionPaddingBottom ?? 16}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={120}
                        value={currentShelf.sectionPaddingBottom ?? 16}
                        onChange={(e) => updateShelf({ sectionPaddingBottom: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Shelf Section Border Control */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Shelf Outer Border</span>
                    <input
                      type="checkbox"
                      checked={Boolean(currentShelf.shelfBorder?.enabled)}
                      onChange={(e) =>
                        updateShelf({
                          shelfBorder: {
                            ...(currentShelf.shelfBorder || {
                              style: "solid",
                              color: "#334155",
                              width: 1,
                              radius: 16,
                            }),
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="accent-amber-500 w-4 h-4 cursor-pointer"
                    />
                  </div>
                  {currentShelf.shelfBorder?.enabled && (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={currentShelf.shelfBorder.color || "#334155"}
                          onChange={(e) =>
                            updateShelf({
                              shelfBorder: { ...currentShelf.shelfBorder!, color: e.target.value },
                            })
                          }
                          className="w-7 h-7 rounded border-0 p-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={currentShelf.shelfBorder.color || "#334155"}
                          onChange={(e) =>
                            updateShelf({
                              shelfBorder: { ...currentShelf.shelfBorder!, color: e.target.value },
                            })
                          }
                          className="flex-1 py-1 px-2 border border-slate-700 rounded bg-slate-800 font-mono uppercase text-xs text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-1">Border Style</span>
                          <select
                            value={currentShelf.shelfBorder.style || "solid"}
                            onChange={(e) =>
                              updateShelf({
                                shelfBorder: { ...currentShelf.shelfBorder!, style: e.target.value as any },
                              })
                            }
                            className="w-full py-1 px-2 border border-slate-700 rounded bg-slate-800 text-white text-[11px]"
                          >
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                            <option value="double">Double</option>
                          </select>
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>Width</span>
                            <span className="font-mono text-white">{currentShelf.shelfBorder.width || 1}px</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={8}
                            value={currentShelf.shelfBorder.width || 1}
                            onChange={(e) =>
                              updateShelf({
                                shelfBorder: { ...currentShelf.shelfBorder!, width: Number(e.target.value) },
                              })
                            }
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>Corner Radius</span>
                          <span className="font-mono text-white">{currentShelf.shelfBorder.radius || 16}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={32}
                          value={currentShelf.shelfBorder.radius || 16}
                          onChange={(e) =>
                            updateShelf({
                              shelfBorder: { ...currentShelf.shelfBorder!, radius: Number(e.target.value) },
                            })
                          }
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. CAROUSEL & MOTION SETTINGS TAB */}
            {leftTab === "carousel" && (
              <div className="space-y-4">
                {/* Header info */}
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs">
                    <Repeat className="w-4 h-4" />
                    <span>Carousel & Motion Settings</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Configure carousel motion, speeds, and layout independently for Desktop and Mobile screens.
                  </p>
                </div>

                {/* Device Selector for Desktop vs Mobile Carousel */}
                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setCarouselDeviceTab("desktop");
                      setDeviceMode("desktop");
                    }}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-lg font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      carouselDeviceTab === "desktop"
                        ? "bg-amber-500 text-slate-950 shadow-md font-black"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop Carousel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCarouselDeviceTab("mobile");
                      setDeviceMode("mobile");
                    }}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-lg font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      carouselDeviceTab === "mobile"
                        ? "bg-amber-500 text-slate-950 shadow-md font-black"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile Carousel</span>
                    {currentShelf.mobileCarouselCustom && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Custom mobile settings active" />
                    )}
                  </button>
                </div>

                {/* ───────────────────────────────────────────────────────────── */}
                {/* A. DESKTOP CAROUSEL SETTINGS */}
                {/* ───────────────────────────────────────────────────────────── */}
                {carouselDeviceTab === "desktop" && (
                  <div className="space-y-4">
                    {/* Mode Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                          Desktop Presentation Mode
                        </label>
                        <span className="text-[10px] text-amber-400 font-mono font-bold">1024px+ Screens</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          {
                            mode: "infinite" as CarouselLoopMode,
                            title: "Infinite Loop Ribbon",
                            badge: "Seamless 360°",
                            desc: "Continuous infinite loop with automatic looping. Never hits a hard edge.",
                            icon: Repeat,
                            activeBorder: "border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-400",
                          },
                          {
                            mode: "normal" as CarouselLoopMode,
                            title: "Normal Slider (Finite)",
                            badge: "Standard",
                            desc: "Traditional horizontal carousel with start and end stops.",
                            icon: ArrowRight,
                            activeBorder: "border-sky-500 bg-sky-500/10 text-white ring-1 ring-sky-400",
                          },
                          {
                            mode: "static" as CarouselLoopMode,
                            title: "Static Multi-Column Grid",
                            badge: "No Scroll",
                            desc: "Fixed responsive card grid. No horizontal scrolling or motion.",
                            icon: LayoutGrid,
                            activeBorder: "border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-400",
                          },
                        ].map((m) => {
                          const isSelected =
                            m.mode === "static"
                              ? currentShelf.carouselLoopMode === "static" || currentShelf.layoutType === "grid"
                              : currentShelf.carouselLoopMode === m.mode ||
                                (!currentShelf.carouselLoopMode && m.mode === "infinite" && currentShelf.layoutType !== "grid");
                          const IconComp = m.icon;

                          return (
                            <button
                              key={m.mode}
                              type="button"
                              onClick={() => {
                                if (m.mode === "static") {
                                  updateShelf({
                                    carouselLoopMode: "static",
                                    layoutType: "grid",
                                    enableCarousel: false,
                                    carouselConfig: {
                                      mode: "static",
                                      autoplay: false,
                                      interval: currentShelf.carouselInterval || 4,
                                      speed: currentShelf.carouselSpeed || "normal",
                                      pauseOnHover: true,
                                      showArrows: false,
                                      arrowPosition: "hidden",
                                      showDots: false,
                                    },
                                  });
                                } else {
                                  updateShelf({
                                    carouselLoopMode: m.mode,
                                    layoutType: "carousel",
                                    enableCarousel: true,
                                    carouselConfig: {
                                      mode: m.mode,
                                      autoplay: true,
                                      interval: currentShelf.carouselInterval || 4,
                                      speed: currentShelf.carouselSpeed || "normal",
                                      pauseOnHover: currentShelf.carouselPauseOnHover !== false,
                                      showArrows: currentShelf.carouselShowArrows !== false,
                                      arrowPosition: currentShelf.carouselArrowPosition || "header",
                                      showDots: Boolean(currentShelf.carouselShowDots),
                                    },
                                  });
                                }
                              }}
                              className={cn(
                                "w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3",
                                isSelected
                                  ? m.activeBorder
                                  : "border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-300"
                              )}
                            >
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                  isSelected ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400"
                                )}
                              >
                                <IconComp className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-extrabold text-sm">{m.title}</span>
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                                      isSelected ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-500"
                                    )}
                                  >
                                    {m.badge}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-400 block mt-1 leading-snug">{m.desc}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Controls for Desktop Carousel (Infinite & Normal) */}
                    {currentShelf.carouselLoopMode !== "static" && currentShelf.layoutType !== "grid" && (
                      <div className="space-y-4 pt-1">
                        {/* Autoplay Toggle */}
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white block">Desktop Autoplay</span>
                            <span className="text-[10px] text-slate-400">Automatically scroll cards after interval</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={currentShelf.enableCarousel !== false}
                            onChange={(e) => updateShelf({ enableCarousel: e.target.checked })}
                            className="accent-amber-500 w-4 h-4 cursor-pointer"
                          />
                        </div>

                        {/* Autoplay Speed / Interval Slider & Presets */}
                        {currentShelf.enableCarousel !== false && (
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                                <span>Desktop Slide Speed</span>
                              </span>
                              <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                {currentShelf.carouselInterval ?? 4}s
                              </span>
                            </div>

                            {/* Slider */}
                            <div>
                              <input
                                type="range"
                                min={1.5}
                                max={12}
                                step={0.5}
                                value={currentShelf.carouselInterval ?? 4}
                                onChange={(e) => updateShelf({ carouselInterval: Number(e.target.value) })}
                                className="w-full accent-amber-500 cursor-pointer"
                              />
                              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                                <span>1.5s (Super Fast)</span>
                                <span>4s (Default)</span>
                                <span>12s (Slow)</span>
                              </div>
                            </div>

                            {/* Quick Presets */}
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-1.5 font-bold">Speed Presets:</span>
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { label: "2s Fast", sec: 2 },
                                  { label: "3s Quick", sec: 3 },
                                  { label: "4s Balanced", sec: 4 },
                                  { label: "5s Relaxed", sec: 5 },
                                  { label: "7s Showcase", sec: 7 },
                                  { label: "10s Slow Pan", sec: 10 },
                                ].map((preset) => (
                                  <button
                                    key={preset.sec}
                                    type="button"
                                    onClick={() => updateShelf({ carouselInterval: preset.sec })}
                                    className={cn(
                                      "py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-center",
                                      (currentShelf.carouselInterval ?? 4) === preset.sec
                                        ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm"
                                        : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500"
                                    )}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Transition Animation Smoothness */}
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                          <span className="font-bold text-white block">Desktop Transition Smoothness</span>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: "fast" as CarouselTransitionSpeed, label: "Fast (300ms)", desc: "Snappy & instant" },
                              { id: "normal" as CarouselTransitionSpeed, label: "Normal (500ms)", desc: "Standard smooth" },
                              { id: "smooth" as CarouselTransitionSpeed, label: "Smooth (800ms)", desc: "Gentle flowing" },
                              { id: "cinematic" as CarouselTransitionSpeed, label: "Cinematic (1200ms)", desc: "Luxury slow glide" },
                            ].map((sp) => (
                              <button
                                key={sp.id}
                                type="button"
                                onClick={() => updateShelf({ carouselSpeed: sp.id })}
                                className={cn(
                                  "p-2 rounded-lg border text-left transition-all cursor-pointer",
                                  (currentShelf.carouselSpeed || "normal") === sp.id
                                    ? "border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-400"
                                    : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                                )}
                              >
                                <span className="font-bold text-xs block">{sp.label}</span>
                                <span className="text-[10px] text-slate-500 block">{sp.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Pause on Hover */}
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white block">Pause on Hover</span>
                            <span className="text-[10px] text-slate-400">Temporarily halt slide when visitor hovers cards</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={currentShelf.carouselPauseOnHover !== false}
                            onChange={(e) => updateShelf({ carouselPauseOnHover: e.target.checked })}
                            className="accent-amber-500 w-4 h-4 cursor-pointer"
                          />
                        </div>

                        {/* Navigation Arrows Controls */}
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-white block">Desktop Navigation Arrows</span>
                              <span className="text-[10px] text-slate-400">Display previous/next navigation buttons</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={currentShelf.carouselShowArrows !== false}
                              onChange={(e) => updateShelf({ carouselShowArrows: e.target.checked })}
                              className="accent-amber-500 w-4 h-4 cursor-pointer"
                            />
                          </div>

                          {currentShelf.carouselShowArrows !== false && (
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-1.5 font-bold">Arrow Placement:</span>
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { pos: "header" as CarouselArrowPosition, label: "Header Top", desc: "Beside title" },
                                  { pos: "sides" as CarouselArrowPosition, label: "Floating Sides", desc: "On card edges" },
                                  { pos: "hidden" as CarouselArrowPosition, label: "Hidden", desc: "Drag only" },
                                ].map((ap) => (
                                  <button
                                    key={ap.pos}
                                    type="button"
                                    onClick={() => updateShelf({ carouselArrowPosition: ap.pos })}
                                    className={cn(
                                      "p-2 rounded-lg border text-left transition-all cursor-pointer",
                                      (currentShelf.carouselArrowPosition || "header") === ap.pos
                                        ? "border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-400"
                                        : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                                    )}
                                  >
                                    <span className="font-bold text-[11px] block">{ap.label}</span>
                                    <span className="text-[9px] text-slate-500 block">{ap.desc}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Pagination Indicator Dots */}
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white block">Desktop Pagination Dots</span>
                            <span className="text-[10px] text-slate-400">Display position dots indicator below shelf cards</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(currentShelf.carouselShowDots)}
                            onChange={(e) => updateShelf({ carouselShowDots: e.target.checked })}
                            className="accent-amber-500 w-4 h-4 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {/* Controls for Desktop Static Multi-Column Grid */}
                    {(currentShelf.carouselLoopMode === "static" || currentShelf.layoutType === "grid") && (
                      <div className="space-y-4 pt-1">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Columns className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Desktop Grid Columns (1024px+)</span>
                          </span>

                          <div className="grid grid-cols-4 gap-1.5">
                            {[2, 3, 4, 5].map((cols) => (
                              <button
                                key={cols}
                                type="button"
                                onClick={() => updateShelf({ gridColumnsDesktop: cols })}
                                className={cn(
                                  "py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center",
                                  (currentShelf.gridColumnsDesktop || 4) === cols
                                    ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-sm"
                                    : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500"
                                )}
                              >
                                {cols} Cols
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* B. MOBILE CAROUSEL SETTINGS */}
                {/* ───────────────────────────────────────────────────────────── */}
                {carouselDeviceTab === "mobile" && (
                  <div className="space-y-4">
                    {/* Mobile Settings Status Header */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-amber-400" />
                          <span className="font-extrabold text-xs text-white">Mobile Carousel Settings</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                          Phones &lt;768px
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {currentShelf.mobileCarouselCustom
                          ? "Custom mobile settings active. These options will be applied on mobile screens."
                          : "Currently mirroring desktop settings. Changing any option below will automatically activate independent mobile settings."}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500 font-medium">Independent Mobile Mode</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              updateShelf({
                                mobileCarouselCustom: false,
                                mobileLayoutType: currentShelf.layoutType,
                                mobileCarouselLoopMode: currentShelf.carouselLoopMode,
                                mobileEnableCarousel: currentShelf.enableCarousel,
                                mobileCarouselInterval: currentShelf.carouselInterval,
                                mobileCarouselSpeed: currentShelf.carouselSpeed,
                                mobileCarouselPauseOnHover: currentShelf.carouselPauseOnHover,
                                mobileCarouselShowArrows: currentShelf.carouselShowArrows,
                                mobileCarouselArrowPosition: currentShelf.carouselArrowPosition,
                                mobileCarouselShowDots: currentShelf.carouselShowDots,
                              });
                            }}
                            className="px-2 py-1 rounded text-[10px] font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                            title="Reset mobile settings to match desktop"
                          >
                            Copy Desktop
                          </button>
                          <input
                            type="checkbox"
                            checked={Boolean(currentShelf.mobileCarouselCustom)}
                            onChange={(e) => updateShelf({ mobileCarouselCustom: e.target.checked })}
                            className="accent-amber-500 w-4 h-4 cursor-pointer"
                            title="Toggle custom mobile settings"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Mobile Mode Selector */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                            Mobile Presentation Mode
                          </label>
                          <span className="text-[10px] text-amber-400 font-mono font-bold">&lt;768px Phones</span>
                        </div>
                        <div className="space-y-2">
                          {[
                            {
                              mode: "infinite" as CarouselLoopMode,
                              title: "Infinite Loop Ribbon",
                              badge: "Seamless 360°",
                              desc: "Continuous touch swipe loop with automatic looping on mobile.",
                              icon: Repeat,
                              activeBorder: "border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-400",
                            },
                            {
                              mode: "normal" as CarouselLoopMode,
                              title: "Normal Slider (Touch Swipe)",
                              badge: "Standard",
                              desc: "Traditional swipe slider with start and end card stops on phone.",
                              icon: ArrowRight,
                              activeBorder: "border-sky-500 bg-sky-500/10 text-white ring-1 ring-sky-400",
                            },
                            {
                              mode: "static" as CarouselLoopMode,
                              title: "Static Card Grid (No Swipe)",
                              badge: "1-2 Columns",
                              desc: "Fixed vertical card grid on mobile without horizontal scrolling.",
                              icon: LayoutGrid,
                              activeBorder: "border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-400",
                            },
                          ].map((m) => {
                            const isSelected =
                              m.mode === "static"
                                ? currentShelf.mobileCarouselLoopMode === "static" || currentShelf.mobileLayoutType === "grid"
                                : currentShelf.mobileCarouselLoopMode === m.mode ||
                                  (!currentShelf.mobileCarouselLoopMode && m.mode === "infinite" && currentShelf.mobileLayoutType !== "grid");
                            const IconComp = m.icon;

                            return (
                              <button
                                key={m.mode}
                                type="button"
                                onClick={() => {
                                  if (m.mode === "static") {
                                    updateShelf({
                                      mobileCarouselCustom: true,
                                      mobileCarouselLoopMode: "static",
                                      mobileLayoutType: "grid",
                                      mobileEnableCarousel: false,
                                    });
                                  } else {
                                    updateShelf({
                                      mobileCarouselCustom: true,
                                      mobileCarouselLoopMode: m.mode,
                                      mobileLayoutType: "carousel",
                                      mobileEnableCarousel: true,
                                    });
                                  }
                                }}
                                className={cn(
                                  "w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3",
                                  isSelected
                                    ? m.activeBorder
                                    : "border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-300"
                                )}
                              >
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                    isSelected ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400"
                                  )}
                                >
                                  <IconComp className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-extrabold text-sm">{m.title}</span>
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                                        isSelected ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-500"
                                      )}
                                    >
                                      {m.badge}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 block mt-1 leading-snug">{m.desc}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Controls for Mobile Carousel */}
                      {currentShelf.mobileCarouselLoopMode !== "static" && currentShelf.mobileLayoutType !== "grid" && (
                        <div className="space-y-4 pt-1">
                          {/* Mobile Autoplay Toggle */}
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-white block">Mobile Autoplay</span>
                              <span className="text-[10px] text-slate-400">Automatically scroll cards on mobile</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={currentShelf.mobileEnableCarousel !== false}
                              onChange={(e) => updateShelf({ mobileCarouselCustom: true, mobileEnableCarousel: e.target.checked })}
                              className="accent-amber-500 w-4 h-4 cursor-pointer"
                            />
                          </div>

                          {/* Mobile Slide Interval / Speed */}
                          {currentShelf.mobileEnableCarousel !== false && (
                            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-white flex items-center gap-1.5">
                                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Mobile Slide Speed</span>
                                </span>
                                <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                  {currentShelf.mobileCarouselInterval ?? 4}s
                                </span>
                              </div>

                              <input
                                type="range"
                                min={1.5}
                                max={12}
                                step={0.5}
                                value={currentShelf.mobileCarouselInterval ?? 4}
                                onChange={(e) => updateShelf({ mobileCarouselCustom: true, mobileCarouselInterval: Number(e.target.value) })}
                                className="w-full accent-amber-500 cursor-pointer"
                              />

                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { label: "2s Fast", sec: 2 },
                                  { label: "3s Quick", sec: 3 },
                                  { label: "4s Standard", sec: 4 },
                                  { label: "5s Relaxed", sec: 5 },
                                  { label: "7s Slow", sec: 7 },
                                  { label: "10s Pan", sec: 10 },
                                ].map((preset) => (
                                  <button
                                    key={preset.sec}
                                    type="button"
                                    onClick={() => updateShelf({ mobileCarouselCustom: true, mobileCarouselInterval: preset.sec })}
                                    className={cn(
                                      "py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-center",
                                      (currentShelf.mobileCarouselInterval ?? 4) === preset.sec
                                        ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm"
                                        : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500"
                                    )}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Mobile Navigation Arrows */}
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-bold text-white block">Mobile Arrow Buttons</span>
                                <span className="text-[10px] text-slate-400">Display navigation arrows on phone</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={Boolean(currentShelf.mobileCarouselShowArrows)}
                                onChange={(e) => updateShelf({ mobileCarouselCustom: true, mobileCarouselShowArrows: e.target.checked })}
                                className="accent-amber-500 w-4 h-4 cursor-pointer"
                              />
                            </div>

                            {currentShelf.mobileCarouselShowArrows && (
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { pos: "hidden" as CarouselArrowPosition, label: "Hidden", desc: "Swipe only" },
                                  { pos: "sides" as CarouselArrowPosition, label: "Sides", desc: "Edge buttons" },
                                  { pos: "header" as CarouselArrowPosition, label: "Header", desc: "Next to title" },
                                ].map((ap) => (
                                  <button
                                    key={ap.pos}
                                    type="button"
                                    onClick={() => updateShelf({ mobileCarouselCustom: true, mobileCarouselArrowPosition: ap.pos })}
                                    className={cn(
                                      "p-2 rounded-lg border text-left transition-all cursor-pointer",
                                      (currentShelf.mobileCarouselArrowPosition || "hidden") === ap.pos
                                        ? "border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-400"
                                        : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                                    )}
                                  >
                                    <span className="font-bold text-[11px] block">{ap.label}</span>
                                    <span className="text-[9px] text-slate-500 block">{ap.desc}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Mobile Pagination Indicator Dots */}
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-white block">Mobile Pagination Dots</span>
                              <span className="text-[10px] text-slate-400">Position dots below cards (recommended for phones)</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={currentShelf.mobileCarouselShowDots !== false}
                              onChange={(e) => updateShelf({ mobileCarouselCustom: true, mobileCarouselShowDots: e.target.checked })}
                              className="accent-amber-500 w-4 h-4 cursor-pointer"
                            />
                          </div>
                        </div>
                      )}

                      {/* Controls for Mobile Static Grid */}
                      {(currentShelf.mobileCarouselLoopMode === "static" || currentShelf.mobileLayoutType === "grid") && (
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                          <span className="font-bold text-white block">Mobile Grid Columns (&lt;768px)</span>
                          <div className="grid grid-cols-2 gap-2">
                            {[1, 2].map((cols) => (
                              <button
                                key={cols}
                                type="button"
                                onClick={() => updateShelf({ mobileCarouselCustom: true, gridColumnsMobile: cols })}
                                className={cn(
                                  "py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center",
                                  (currentShelf.gridColumnsMobile || 1) === cols
                                    ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-sm"
                                    : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500"
                                )}
                              >
                                {cols === 1 ? "1 Col (Full Width)" : "2 Cols (Compact)"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. CARD STYLE TAB */}
            {leftTab === "style" && (
              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Choose Card Composition
                </label>
                <div className="space-y-2">
                  {CARD_STYLES.map((cs) => (
                    <button
                      key={cs.id}
                      type="button"
                      onClick={() => updateShelf({ cardStyle: cs.id })}
                      className={cn(
                        "w-full p-3 rounded-xl border text-left transition-all cursor-pointer",
                        currentShelf.cardStyle === cs.id
                          ? "border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-400"
                          : "border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-300"
                      )}
                    >
                      <span className="font-extrabold text-sm block">{cs.name}</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">{cs.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Desktop Card Size</label>
                    <select
                      value={currentShelf.cardSizeDesktop || "medium"}
                      onChange={(e) => updateShelf({ cardSizeDesktop: e.target.value as any })}
                      className="w-full py-1.5 px-2 rounded-lg border border-slate-700 bg-slate-800 text-white"
                    >
                      <option value="very-small">Very Small</option>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="big">Big</option>
                      <option value="very-big">Very Big</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Mobile Card Size</label>
                    <select
                      value={currentShelf.cardSizeMobile || "medium"}
                      onChange={(e) => updateShelf({ cardSizeMobile: e.target.value as any })}
                      className="w-full py-1.5 px-2 rounded-lg border border-slate-700 bg-slate-800 text-white"
                    >
                      <option value="very-small">Very Small</option>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="big">Big</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 3. IMAGES & SPLIT LAYOUT TAB */}
            {leftTab === "images" && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                    Image Arrangement Preset
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "single", label: "Single Image" },
                      { id: "split-horizontal", label: "Split Horizontal" },
                      { id: "split-vertical", label: "Split Vertical" },
                      { id: "three-grid", label: "3-Image Grid" },
                      { id: "four-grid", label: "4-Image Grid" },
                      { id: "thumbnail-strip", label: "Thumbnail Strip" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          updateShelf({
                            imageArrangement: {
                              ...(currentShelf.imageArrangement || {
                                splitRatio: "50/50",
                                aspectRatio: "16/10",
                                cropMode: "cover",
                              }),
                              preset: p.id as ImageArrangementPreset,
                            },
                          })
                        }
                        className={cn(
                          "p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer",
                          currentShelf.imageArrangement?.preset === p.id
                            ? "border-amber-500 bg-amber-500/10 text-amber-400 ring-1 ring-amber-400"
                            : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Split Ratio */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                    Split Proportions
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(["50/50", "60/40", "40/60", "70/30", "30/70"] as ImageSplitRatio[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() =>
                          updateShelf({
                            imageArrangement: {
                              ...(currentShelf.imageArrangement || {
                                preset: "split-horizontal",
                                aspectRatio: "16/10",
                                cropMode: "cover",
                              }),
                              splitRatio: r,
                            },
                          })
                        }
                        className={cn(
                          "py-1.5 rounded-lg border font-mono text-[11px] font-bold transition-all cursor-pointer",
                          currentShelf.imageArrangement?.splitRatio === r
                            ? "border-amber-500 bg-amber-500 text-slate-950 font-black"
                            : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Image Aspect Ratio
                  </label>
                  <select
                    value={currentShelf.imageArrangement?.aspectRatio || "16/10"}
                    onChange={(e) =>
                      updateShelf({
                        imageArrangement: {
                          ...(currentShelf.imageArrangement || {
                            preset: "single",
                            splitRatio: "50/50",
                            cropMode: "cover",
                          }),
                          aspectRatio: e.target.value as any,
                        },
                      })
                    }
                    className="w-full py-1.5 px-2 rounded-lg border border-slate-700 bg-slate-800 text-white"
                  >
                    <option value="16/10">16:10 (Default)</option>
                    <option value="16/9">16:9 (Cinematic)</option>
                    <option value="4/3">4:3 (Traditional)</option>
                    <option value="1/1">1:1 (Square)</option>
                    <option value="3/4">3:4 (Portrait)</option>
                  </select>
                </div>
              </div>
            )}

            {/* 4. CONTENT & LISTINGS TAB */}
            {leftTab === "content" && (
              <div className="space-y-4">
                {/* Sourcing Mode */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                    Content Source Mode
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["manual", "automatic", "hybrid"] as ContentSourceType[]).map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => updateShelf({ contentSource: src })}
                        className={cn(
                          "py-1.5 rounded-lg border font-bold capitalize text-xs transition-all cursor-pointer",
                          currentShelf.contentSource === src
                            ? "border-amber-500 bg-amber-500/10 text-amber-400 ring-1 ring-amber-400"
                            : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                        )}
                      >
                        {src}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Automatic Filter Options */}
                {(currentShelf.contentSource === "automatic" || currentShelf.contentSource === "hybrid") && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-amber-400" /> Automatic Matching Filters
                    </span>

                    <div className="space-y-2 text-[11px]">
                      <div>
                        <span className="text-slate-400">City / Locality</span>
                        <input
                          type="text"
                          value={currentShelf.autoFilters?.city || ""}
                          onChange={(e) =>
                            updateShelf({
                              autoFilters: { ...currentShelf.autoFilters, city: e.target.value },
                            })
                          }
                          placeholder="e.g. Vijayawada, Guntur"
                          className="w-full mt-0.5 py-1 px-2 border border-slate-700 rounded bg-slate-800 text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400">Min Price (₹)</span>
                          <input
                            type="number"
                            value={currentShelf.autoFilters?.minPrice || ""}
                            onChange={(e) =>
                              updateShelf({
                                autoFilters: {
                                  ...currentShelf.autoFilters,
                                  minPrice: e.target.value ? Number(e.target.value) : undefined,
                                },
                              })
                            }
                            placeholder="0"
                            className="w-full mt-0.5 py-1 px-2 border border-slate-700 rounded bg-slate-800 text-white font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-slate-400">Max Price (₹)</span>
                          <input
                            type="number"
                            value={currentShelf.autoFilters?.maxPrice || ""}
                            onChange={(e) =>
                              updateShelf({
                                autoFilters: {
                                  ...currentShelf.autoFilters,
                                  maxPrice: e.target.value ? Number(e.target.value) : undefined,
                                },
                              })
                            }
                            placeholder="Unlimited"
                            className="w-full mt-0.5 py-1 px-2 border border-slate-700 rounded bg-slate-800 text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(currentShelf.autoFilters?.readyToMove)}
                            onChange={(e) =>
                              updateShelf({
                                autoFilters: { ...currentShelf.autoFilters, readyToMove: e.target.checked },
                              })
                            }
                            className="accent-amber-500"
                          />
                          <span>Ready to Move</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(currentShelf.autoFilters?.reraApproved)}
                            onChange={(e) =>
                              updateShelf({
                                autoFilters: { ...currentShelf.autoFilters, reraApproved: e.target.checked },
                              })
                            }
                            className="accent-amber-500"
                          />
                          <span>RERA Only</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Listing Search & Add */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Search & Add Properties/Projects
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by title, location, builder..."
                      className="w-full py-1.5 pl-8 pr-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs"
                    />
                  </div>

                  {searchQuery && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-1 space-y-1">
                      {allProperties
                        .filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 5)
                        .map((prop) => (
                          <div
                            key={prop.id}
                            className="p-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between"
                          >
                            <span className="truncate flex-1 font-bold">{prop.title}</span>
                            <button
                              type="button"
                              onClick={() => handleAddListing(prop, "property")}
                              className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px] ml-2 cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      {allProjects
                        .filter((pr) => pr.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 5)
                        .map((proj) => (
                          <div
                            key={proj.id}
                            className="p-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between"
                          >
                            <span className="truncate flex-1 font-bold text-amber-400">
                              [Project] {proj.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddListing(proj, "project")}
                              className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px] ml-2 cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Current Shelf Items List */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Curated Order & Pinned Items
                  </span>
                  {currentShelf.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate flex-1">
                        <span className="font-mono text-[10px] text-slate-500">{idx + 1}</span>
                        <span className="truncate font-bold text-xs">{item.id}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 uppercase font-bold text-slate-400">
                          {item.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => handleMoveListing(idx, "up")}
                          disabled={idx === 0}
                          aria-label="Move item up"
                          className="p-1 hover:bg-slate-800 rounded disabled:opacity-20 cursor-pointer"
                        >
                          <MoveUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveListing(idx, "down")}
                          disabled={idx === currentShelf.items.length - 1}
                          aria-label="Move item down"
                          className="p-1 hover:bg-slate-800 rounded disabled:opacity-20 cursor-pointer"
                        >
                          <MoveDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePin(item.id)}
                          aria-label={item.isPinned ? "Unpin item" : "Pin item"}
                          className={cn(
                            "p-1 rounded cursor-pointer",
                            item.isPinned ? "text-amber-400 bg-amber-500/20" : "text-slate-500 hover:text-white"
                          )}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveListing(item.id)}
                          aria-label="Remove item from shelf"
                          className="p-1 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* CENTER PANEL: Interactive Canvas & Live Preview */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <main className="flex-1 bg-slate-900/40 flex flex-col items-center overflow-y-auto p-4 sm:p-6 relative">
          {/* Canvas Sub-toolbar */}
          <div className="w-full max-w-5xl mb-4 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-bold">Preview Target:</span>
              <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setItemTypeView("all")}
                  className={cn(
                    "px-2.5 py-1 rounded font-bold cursor-pointer transition-colors",
                    itemTypeView === "all" ? "bg-amber-500 text-slate-950" : "hover:text-white"
                  )}
                >
                  All ({previewItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setItemTypeView("property")}
                  className={cn(
                    "px-2.5 py-1 rounded font-bold cursor-pointer transition-colors",
                    itemTypeView === "property" ? "bg-amber-500 text-slate-950" : "hover:text-white"
                  )}
                >
                  Properties
                </button>
                <button
                  type="button"
                  onClick={() => setItemTypeView("project")}
                  className={cn(
                    "px-2.5 py-1 rounded font-bold cursor-pointer transition-colors",
                    itemTypeView === "project" ? "bg-amber-500 text-slate-950" : "hover:text-white"
                  )}
                >
                  Projects
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {/* Shelf Motion Mode Badge */}
              {(() => {
                const isMobileView = deviceMode === "mobile";
                const hasMobileSettings = Boolean(
                  currentShelf.mobileCarouselCustom ||
                  currentShelf.mobileLayoutType ||
                  currentShelf.mobileCarouselLoopMode ||
                  currentShelf.mobileEnableCarousel !== undefined ||
                  currentShelf.mobileCarouselInterval ||
                  currentShelf.mobileCarouselShowArrows !== undefined ||
                  currentShelf.mobileCarouselShowDots !== undefined
                );
                const useMobile = isMobileView && hasMobileSettings;
                const badgeText = useMobile
                  ? (currentShelf.mobileLayoutType === "grid" || currentShelf.mobileCarouselLoopMode === "static"
                      ? `Mobile Grid (${currentShelf.gridColumnsMobile || 1} col)`
                      : `Mobile ${currentShelf.mobileCarouselLoopMode || "infinite"}${currentShelf.mobileEnableCarousel !== false ? ` (${currentShelf.mobileCarouselInterval ?? 4}s)` : " (Manual)"}`)
                  : (currentShelf.layoutType === "grid" || currentShelf.carouselLoopMode === "static"
                      ? `Desktop Grid (${currentShelf.gridColumnsDesktop || 4} cols)`
                      : `Desktop ${currentShelf.carouselLoopMode || "infinite"}${currentShelf.enableCarousel !== false ? ` (${currentShelf.carouselInterval ?? 4}s)` : " (Manual)"}`);

                return (
                  <button
                    type="button"
                    onClick={() => {
                      setLeftTab("carousel");
                      if (deviceMode === "mobile") {
                        setCarouselDeviceTab("mobile");
                      } else {
                        setCarouselDeviceTab("desktop");
                      }
                    }}
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-[11px] font-mono text-amber-400 cursor-pointer transition-colors"
                    title="Click to configure carousel & motion"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span className="font-bold">{badgeText}</span>
                  </button>
                );
              })()}

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Card:</span>
                <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 max-w-[160px] truncate">
                  {activeItem?.customHeadline || (activeItem ? ("title" in activeItem ? activeItem.title : activeItem.name) : "Active Card")}
                </span>
              </div>
              <span className="text-slate-600">›</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Element:</span>
                <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700 capitalize">
                  {selectedElementId}
                </span>
              </div>
            </div>
          </div>

          {(() => {
            const isMobileView = deviceMode === "mobile";
            const hasMobileSettings = Boolean(
              currentShelf.mobileCarouselCustom ||
              currentShelf.mobileLayoutType ||
              currentShelf.mobileCarouselLoopMode ||
              currentShelf.mobileEnableCarousel !== undefined ||
              currentShelf.mobileCarouselInterval ||
              currentShelf.mobileCarouselShowArrows !== undefined ||
              currentShelf.mobileCarouselShowDots !== undefined
            );
            const useMobile = isMobileView && hasMobileSettings;

            const activeLayoutType = useMobile && currentShelf.mobileLayoutType ? currentShelf.mobileLayoutType : currentShelf.layoutType;
            const activeLoopMode = useMobile && currentShelf.mobileCarouselLoopMode !== undefined ? currentShelf.mobileCarouselLoopMode : currentShelf.carouselLoopMode;
            const activeEnableCarousel = useMobile && currentShelf.mobileEnableCarousel !== undefined ? currentShelf.mobileEnableCarousel : currentShelf.enableCarousel;
            const activeShowArrows = useMobile && currentShelf.mobileCarouselShowArrows !== undefined ? currentShelf.mobileCarouselShowArrows : currentShelf.carouselShowArrows;
            const activeArrowPosition = useMobile && currentShelf.mobileCarouselArrowPosition ? currentShelf.mobileCarouselArrowPosition : currentShelf.carouselArrowPosition;
            const activeShowDots = useMobile && currentShelf.mobileCarouselShowDots !== undefined ? currentShelf.mobileCarouselShowDots : currentShelf.carouselShowDots;

            const isStaticGrid =
              activeLayoutType === "grid" ||
              activeLoopMode === "static";

            return (
              /* Device Mockup Shell */
              <div
                className={cn(
                  "transition-all duration-300 mx-auto",
                  deviceMode === "mobile"
                    ? "w-[375px] border-4 border-slate-800 rounded-3xl p-3 bg-slate-950 shadow-2xl min-h-[660px]"
                    : deviceMode === "tablet"
                    ? "w-[768px] border-4 border-slate-800 rounded-3xl p-4 bg-slate-950 shadow-2xl min-h-[700px]"
                    : "w-full max-w-6xl"
                )}
              >
                {/* Shelf Section Container with Dynamic Border & Background */}
                <div
                  style={{
                    ...borderConfigToStyles(currentShelf.shelfBorder),
                    backgroundColor: currentShelf.sectionBgColor || "transparent",
                    paddingTop: currentShelf.sectionPaddingTop ? `${currentShelf.sectionPaddingTop}px` : undefined,
                    paddingBottom: currentShelf.sectionPaddingBottom ? `${currentShelf.sectionPaddingBottom}px` : undefined,
                  }}
                  className="w-full space-y-4"
                >
                  {/* Shelf Heading */}
                  <div
                    className={cn(
                      "flex items-center justify-between gap-3",
                      currentShelf.headingAlignment === "center" && "text-center",
                      currentShelf.headingAlignment === "right" && "text-right"
                    )}
                  >
                    <div
                      className={cn(
                        "flex-1",
                        currentShelf.headingAlignment === "center" && "mx-auto text-center",
                        currentShelf.headingAlignment === "right" && "ml-auto text-right"
                      )}
                    >
                      <h2
                        style={currentShelf.headingColor ? { color: currentShelf.headingColor } : undefined}
                        className={cn(
                          "font-black tracking-tight text-white",
                          currentShelf.headingSize || "text-xl sm:text-2xl"
                        )}
                      >
                        {currentShelf.title}
                      </h2>
                      {currentShelf.subtitle && (
                        <p
                          style={currentShelf.subtitleColor ? { color: currentShelf.subtitleColor } : undefined}
                          className="text-xs text-slate-400 mt-0.5"
                        >
                          {currentShelf.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Header Navigation Arrows (Live Interactive Preview) */}
                    {!isStaticGrid &&
                      activeShowArrows !== false &&
                      (activeArrowPosition || "header") === "header" && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handlePreviewScroll("left")}
                            aria-label="Previous items"
                            className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePreviewScroll("right")}
                            aria-label="Next items"
                            className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                  </div>

                  {/* Render Shelf Cards Grid/Row */}
                  {previewItems.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center text-slate-500">
                      <p className="font-bold">No matching listings found for this shelf.</p>
                      <p className="text-xs mt-1">Add manual properties or loosen automatic filter criteria.</p>
                    </div>
                  ) : isStaticGrid ? (
                    <div
                      className={cn(
                        "grid gap-4",
                        currentShelf.gridColumnsDesktop === 2
                          ? "lg:grid-cols-2"
                          : currentShelf.gridColumnsDesktop === 3
                          ? "lg:grid-cols-3"
                          : currentShelf.gridColumnsDesktop === 5
                          ? "lg:grid-cols-5"
                          : "lg:grid-cols-4",
                        currentShelf.gridColumnsTablet === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
                        currentShelf.gridColumnsMobile === 2 ? "grid-cols-2" : "grid-cols-1"
                      )}
                    >
                      {previewItems.slice(0, currentShelf.maxItems || 8).map((item, idx) => (
                        <div key={`${item.id}-${idx}`} className="w-full">
                          <ShelfCard
                            item={item}
                            itemId={item.id}
                            selectedItemId={selectedItemId || activeItem?.id}
                            cardStyle={currentShelf.cardStyle}
                            cardSizeDesktop={currentShelf.cardSizeDesktop}
                            cardSizeMobile={currentShelf.cardSizeMobile}
                            cardBorder={item.cardBorder || currentShelf.cardBorder}
                            imageArrangement={currentShelf.imageArrangement}
                            elementOrder={currentShelf.elementOrder}
                            elements={currentShelf.elements}
                            selectedElementId={selectedElementId}
                            onSelectElement={(elId, itId) => {
                              setSelectedElementId(elId);
                              if (itId) setSelectedItemId(itId);
                            }}
                            isEditable={true}
                            index={idx}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="relative group">
                      {/* Floating Side Arrows (Live Interactive Preview) */}
                      {!isStaticGrid &&
                        activeShowArrows !== false &&
                        activeArrowPosition === "sides" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handlePreviewScroll("left")}
                              aria-label="Previous items"
                              className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-950/85 hover:bg-amber-500 hover:text-slate-950 text-white shadow-xl backdrop-blur-md border border-slate-700 flex items-center justify-center transition-all cursor-pointer opacity-90 hover:opacity-100 active:scale-95"
                            >
                              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePreviewScroll("right")}
                              aria-label="Next items"
                              className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-950/85 hover:bg-amber-500 hover:text-slate-950 text-white shadow-xl backdrop-blur-md border border-slate-700 flex items-center justify-center transition-all cursor-pointer opacity-90 hover:opacity-100 active:scale-95"
                            >
                              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                            </button>
                          </>
                        )}

                      <div
                        ref={previewScrollRef}
                        className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
                      >
                        {previewItems.slice(0, 10).map((item, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            className="w-[280px] sm:w-[320px] shrink-0"
                          >
                            <ShelfCard
                              item={item}
                              itemId={item.id}
                              selectedItemId={selectedItemId || activeItem?.id}
                              cardStyle={currentShelf.cardStyle}
                              cardSizeDesktop={currentShelf.cardSizeDesktop}
                              cardSizeMobile={currentShelf.cardSizeMobile}
                              cardBorder={item.cardBorder || currentShelf.cardBorder}
                              imageArrangement={currentShelf.imageArrangement}
                              elementOrder={currentShelf.elementOrder}
                              elements={currentShelf.elements}
                              selectedElementId={selectedElementId}
                              onSelectElement={(elId, itId) => {
                                setSelectedElementId(elId);
                                if (itId) setSelectedItemId(itId);
                              }}
                              isEditable={true}
                              index={idx}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Pagination Indicator Dots */}
                      {!isStaticGrid && Boolean(activeShowDots) && (
                        <div className="flex items-center justify-center gap-1.5 pt-3">
                          {previewItems.slice(0, 8).map((_, dotIdx) => (
                            <span
                              key={dotIdx}
                              className={cn(
                                "h-2 rounded-full transition-all duration-300",
                                dotIdx === 0
                                  ? "w-6 bg-amber-500 shadow-sm"
                                  : "w-2 bg-slate-700 hover:bg-slate-600"
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </main>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* RIGHT PANEL: Element Inspector (Typography, Borders, Outlines) */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <aside className="w-80 md:w-96 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0 overflow-hidden">
          <ElementInspector
            selectedElementId={selectedElementId}
            onSelectElement={(id) => setSelectedElementId(id)}
            elements={currentShelf.elements || {}}
            onChangeElement={(id, updated) => {
              const currentElem = currentShelf.elements?.[id] || { id, label: id, visible: true };
              updateShelf({
                elements: {
                  ...currentShelf.elements,
                  [id]: {
                    ...currentElem,
                    ...updated,
                  },
                },
              });
            }}
            elementOrder={currentShelf.elementOrder || ["image", "badge", "price", "title", "specs", "location", "developer", "progress", "cta"]}
            onChangeElementOrder={(newOrder) => updateShelf({ elementOrder: newOrder })}
            cardBorder={currentShelf.cardBorder}
            onChangeCardBorder={(newBorder) => updateShelf({ cardBorder: newBorder })}
            onApplyBorderToAllCards={handleApplyBorderToAllCards}
            activeItem={activeItem}
            previewItems={previewItems}
            selectedItemId={selectedItemId || activeItem?.id}
            onSelectItemId={(id) => setSelectedItemId(id)}
            onUpdateItemContent={handleUpdateItemContent}
            onApplyToAllCards={handleApplyToAllCards}
          />
        </aside>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PUBLISH CONFIRMATION MODAL */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-400" /> Confirm Publication
              </h3>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Publishing will update <strong>{currentShelf.title}</strong> directly on the live homepage for all visitors. Draft revisions are automatically archived.
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Shelf:</span>
                <span className="font-bold text-white">{currentShelf.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Composition:</span>
                <span className="font-bold text-amber-400">{currentShelf.cardStyle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Listings:</span>
                <span className="font-bold text-white">{previewItems.length} active listings</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={isPublishing}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md"
              >
                {isPublishing ? "Publishing..." : "Confirm & Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
