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
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Overview Top Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
              ROAD CMS
            </span>
            {hasUnsavedDrafts && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                Drafts Pending Publish
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Homepage Shelf Builder & Visual CMS</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Independently manage, restyle, reorder, and configure all homepage shelves, card borders, typography, and listing rules.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleRestore}
            disabled={isRestoring}
            className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isRestoring ? "Restoring..." : "Restore Defaults"}</span>
          </button>

          <button
            type="button"
            onClick={handlePublishAll}
            disabled={isPublishing}
            className="px-4 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-black text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isPublishing ? "Publishing..." : "Publish Live Layout"}</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Custom Shelf</span>
          </button>
        </div>
      </div>

      {/* Shelves List Table / Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-2 font-bold">
          <span>Active Shelves ({shelves.length})</span>
          <span>Order matches public homepage presentation</span>
        </div>

        <div className="space-y-2.5">
          {shelves.map((shelf, index) => {
            const isCustom = Boolean(shelf.isCustom);
            const isDeleting = deleteConfirmId === shelf.id;

            return (
              <div
                key={shelf.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                  shelf.isActive
                    ? "bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-md"
                    : "bg-slate-950/60 border-slate-900 opacity-60"
                )}
              >
                {/* Left: Reorder handles + Shelf Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveShelf(index, "up")}
                      disabled={index === 0}
                      aria-label="Move shelf up"
                      className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-20 cursor-pointer"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveShelf(index, "down")}
                      disabled={index === shelves.length - 1}
                      aria-label="Move shelf down"
                      className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-20 cursor-pointer"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Order Index Badge */}
                  <span className="font-mono text-xs font-bold text-slate-500 w-5 text-center shrink-0">
                    #{index + 1}
                  </span>

                  {/* Thumbnail / Card Style Badge */}
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-1 text-center shrink-0">
                    <Layers className="w-4 h-4 text-amber-500 mb-0.5" />
                    <span className="text-[8px] font-mono text-slate-400 uppercase truncate w-full">
                      {shelf.cardStyle?.split("-")[0]}
                    </span>
                  </div>

                  {/* Shelf Meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-white truncate">
                        {shelf.title || shelf.name}
                      </span>
                      {isCustom && (
                        <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                          Custom
                        </span>
                      )}
                      <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-slate-800 text-slate-400 uppercase">
                        {shelf.shelfType}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.2 rounded-full text-[9px] font-bold uppercase",
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

                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                      <span>{shelf.items?.length || 0} manual listings</span>
                      <span>•</span>
                      <span>Source: {shelf.contentSource}</span>
                      <span>•</span>
                      <span>Layout: {shelf.layoutType || "carousel"}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => onToggleVisibility(shelf.id)}
                    title={shelf.isActive ? "Hide shelf from homepage" : "Show shelf on homepage"}
                    className={cn(
                      "p-2 rounded-xl border transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold",
                      shelf.isActive
                        ? "border-slate-800 bg-slate-800 text-slate-300 hover:text-white"
                        : "border-slate-800 bg-slate-950 text-slate-500 hover:text-white"
                    )}
                  >
                    {shelf.isActive ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                    <span className="hidden sm:inline">{shelf.isActive ? "Visible" : "Hidden"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDuplicateShelf(shelf.id)}
                    title="Duplicate shelf configuration"
                    className="p-2 rounded-xl border border-slate-800 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
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
                            className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs cursor-pointer hover:bg-red-500"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(shelf.id)}
                          title="Delete custom shelf"
                          className="p-2 rounded-xl border border-slate-800 bg-slate-800 hover:bg-red-950/60 hover:text-red-400 text-slate-400 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => onEditShelf(shelf.id)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
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
