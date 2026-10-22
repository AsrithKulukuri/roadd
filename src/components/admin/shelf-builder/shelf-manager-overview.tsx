"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Plus,
  Edit3,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  MoveUp,
  MoveDown,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  ExternalLink,
  Send,
  HelpCircle,
} from "lucide-react";
import type { ShelfDefinition, ShelfStatus } from "@/types/shelf-builder";
import { cn } from "@/lib/utils";

interface ShelfManagerOverviewProps {
  shelves: ShelfDefinition[];
  onEditShelf: (shelfId: string) => void;
  onReorderShelves: (reordered: ShelfDefinition[]) => void;
  onToggleVisibility: (shelfId: string) => void;
  onDuplicateShelf: (shelfId: string) => void;
  onDeleteShelf: (shelfId: string) => void;
  onRestoreDefaults: () => Promise<void>;
  onPublishAll: () => Promise<void>;
  onOpenCreateModal: () => void;
  hasUnsavedDrafts?: boolean;
}

export function ShelfManagerOverview({
  shelves,
  onEditShelf,
  onReorderShelves,
  onToggleVisibility,
  onDuplicateShelf,
  onDeleteShelf,
  onRestoreDefaults,
  onPublishAll,
  onOpenCreateModal,
  hasUnsavedDrafts = false,
}: ShelfManagerOverviewProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const moveShelf = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= shelves.length) return;
    const reordered = [...shelves];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    onReorderShelves(reordered);
  };

  const handleRestore = async () => {
    if (window.confirm("Are you sure you want to restore the 8 default homepage shelves? Custom shelves will be preserved or reset.")) {
      try {
        setIsRestoring(true);
        await onRestoreDefaults();
      } finally {
        setIsRestoring(false);
      }
    }
  };

  const handlePublishAll = async () => {
    try {
      setIsPublishing(true);
      await onPublishAll();
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Overview Top Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="w-full sm:w-auto">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
              ROAD CMS
            </span>
            {hasUnsavedDrafts && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                Drafts Pending Publish
              </span>
            )}
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-white">Homepage Shelf Builder & Visual CMS</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Independently manage, restyle, reorder, and configure all homepage shelves, card borders, typography, and listing rules.
          </p>
        </div>

        {/* Header Action Buttons (Responsive on mobile) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <button
              type="button"
              onClick={handleRestore}
              disabled={isRestoring}
              className="px-3 py-2.5 sm:py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors touch-manipulation active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{isRestoring ? "Restoring..." : "Restore Defaults"}</span>
            </button>

            <button
              type="button"
              onClick={handlePublishAll}
              disabled={isPublishing}
              className="px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm touch-manipulation active:scale-95"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{isPublishing ? "Publishing..." : "Publish Live Layout"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95 touch-manipulation"
          >
            <Plus className="w-4 h-4 stroke-[3] shrink-0" />
            <span>Create Custom Shelf</span>
          </button>
        </div>
      </div>

      {/* Shelves List Table / Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 sm:px-2 font-bold">
          <span>Active Shelves ({shelves.length})</span>
          <span className="hidden sm:inline">Order matches public homepage presentation</span>
          <span className="sm:hidden text-[11px] text-slate-500">Tap arrows to reorder</span>
        </div>

        <div className="space-y-2.5">
          {shelves.map((shelf, index) => {
            const isCustom = Boolean(shelf.isCustom);
            const isDeleting = deleteConfirmId === shelf.id;

            return (
              <div
                key={shelf.id}
                className={cn(
                  "p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4",
                  shelf.isActive
                    ? "bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-md"
                    : "bg-slate-950/60 border-slate-900 opacity-60"
                )}
              >
                {/* Left: Reorder handles + Shelf Details */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  {/* Reorder Buttons (Touch-friendly on mobile) */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveShelf(index, "up")}
                      disabled={index === 0}
                      aria-label="Move shelf up"
                      className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-20 cursor-pointer touch-manipulation active:scale-90 transition-transform"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveShelf(index, "down")}
                      disabled={index === shelves.length - 1}
                      aria-label="Move shelf down"
                      className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-20 cursor-pointer touch-manipulation active:scale-90 transition-transform"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Order Index Badge */}
                  <span className="font-mono text-xs font-bold text-slate-500 w-5 text-center shrink-0">
                    #{index + 1}
                  </span>

                  {/* Thumbnail / Card Style Badge */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-1 text-center shrink-0">
                    <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mb-0.5" />
                    <span className="text-[7px] sm:text-[8px] font-mono text-slate-400 uppercase truncate w-full">
                      {shelf.cardStyle?.split("-")[0]}
                    </span>
                  </div>

                  {/* Shelf Meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="font-black text-sm text-white truncate max-w-[180px] sm:max-w-none">
                        {shelf.title || shelf.name}
                      </span>
                      {isCustom && (
                        <span className="px-1.5 sm:px-2 py-0.2 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                          Custom
                        </span>
                      )}
                      <span className="px-1.5 sm:px-2 py-0.2 rounded-full text-[9px] font-bold bg-slate-800 text-slate-400 uppercase">
                        {shelf.shelfType}
                      </span>
                      <span
                        className={cn(
                          "px-1.5 sm:px-2 py-0.2 rounded-full text-[9px] font-bold uppercase",
                          shelf.status === "published"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : shelf.status === "draft"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-slate-800 text-slate-500"
                        )}
                      >
                        {shelf.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {shelf.subtitle || `Style: ${shelf.cardStyle} • Source: ${shelf.contentSource}`}
                    </p>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[10px] text-slate-500 mt-1">
                      <span>{shelf.items?.length || 0} manual listings</span>
                      <span>•</span>
                      <span>Source: {shelf.contentSource}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-medium">
                        {shelf.carouselLoopMode === "static" || shelf.layoutType === "grid"
                          ? `Static Grid (${shelf.gridColumnsDesktop || 4} cols)`
                          : `${shelf.carouselLoopMode === "normal" ? "Normal Slider" : "Infinite Ribbon"} (${shelf.carouselInterval || 4}s)`}
                      </span>
                      {shelf.carouselShowArrows !== false && shelf.carouselLoopMode !== "static" && shelf.layoutType !== "grid" && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="text-slate-400 hidden sm:inline">
                            arrows: {shelf.carouselArrowPosition || "header"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions (Toolbar responsive on mobile) */}
                <div className="flex items-center justify-between md:justify-end w-full md:w-auto pt-2.5 md:pt-0 border-t border-slate-800/80 md:border-t-0 gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleVisibility(shelf.id)}
                      title={shelf.isActive ? "Hide shelf from homepage" : "Show shelf on homepage"}
                      className={cn(
                        "px-2.5 py-1.5 sm:p-2 rounded-xl border transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold touch-manipulation",
                        shelf.isActive
                          ? "border-slate-800 bg-slate-800 text-slate-300 hover:text-white"
                          : "border-slate-800 bg-slate-950 text-slate-500 hover:text-white"
                      )}
                    >
                      {shelf.isActive ? <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                      <span className="text-[11px] sm:text-xs">{shelf.isActive ? "Visible" : "Hidden"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDuplicateShelf(shelf.id)}
                      title="Duplicate shelf configuration"
                      className="p-2 rounded-xl border border-slate-800 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors touch-manipulation active:scale-95"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {isCustom && (
                      <>
                        {isDeleting ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteShelf(shelf.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs cursor-pointer hover:bg-red-500 touch-manipulation"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 text-xs cursor-pointer touch-manipulation"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(shelf.id)}
                            title="Delete custom shelf"
                            className="p-2 rounded-xl border border-slate-800 bg-slate-800 hover:bg-red-950/60 hover:text-red-400 text-slate-400 cursor-pointer transition-colors touch-manipulation active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditShelf(shelf.id)}
                    className="flex-1 md:flex-initial justify-center px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95 touch-manipulation"
                  >
                    <Edit3 className="w-3.5 h-3.5 shrink-0" />
                    <span>Visual Edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
