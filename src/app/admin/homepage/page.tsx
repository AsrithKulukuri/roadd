"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import type { ShelfDefinition } from "@/types/shelf-builder";
import { CANONICAL_DEFAULT_SHELVES } from "@/lib/shelf-builder-defaults";
import { ShelfManagerOverview } from "@/components/admin/shelf-builder/shelf-manager-overview";
import { ShelfEditor } from "@/components/admin/shelf-builder/shelf-editor";
import { CustomShelfModal } from "@/components/admin/shelf-builder/custom-shelf-modal";

export default function HomepageShelvesAdminPage() {
  const { properties, fetchProperties, isLoading: isPropsLoading } = usePropertiesStore();
  const { projects, fetchProjects, isLoading: isProjsLoading } = useProjectsStore();

  const [shelves, setShelves] = useState<ShelfDefinition[]>(CANONICAL_DEFAULT_SHELVES);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [editingShelfId, setEditingShelfId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [hasUnsavedDrafts, setHasUnsavedDrafts] = useState(false);

  // Load properties and projects
  useEffect(() => {
    void Promise.all([fetchProperties(), fetchProjects()]);
  }, [fetchProperties, fetchProjects]);

  // Load shelves from backend API (Draft mode for admin workspace)
  useEffect(() => {
    let cancelled = false;
    async function loadLayout() {
      try {
        const response = await fetch("/api/home-sections?status=draft", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled && data.configured && Array.isArray(data.sections) && data.sections.length > 0) {
          setShelves(data.sections);
          if (data.status === "draft") {
            setHasUnsavedDrafts(true);
          }
        }
      } catch (err) {
        console.error("Failed to load homepage sections:", err);
      } finally {
        if (!cancelled) setLayoutLoaded(true);
      }
    }
    void loadLayout();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save Draft to Backend
  const handleSaveDraft = useCallback(
    async (updatedShelf: ShelfDefinition) => {
      const nextShelves = shelves.map((s) => (s.id === updatedShelf.id ? updatedShelf : s));
      setShelves(nextShelves);
      setHasUnsavedDrafts(true);

      const response = await fetch("/api/home-sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: nextShelves,
          action: "save_draft",
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save draft");
      }
      toast.success(`Draft saved for "${updatedShelf.name}".`);
    },
    [shelves]
  );

  // Publish Single Shelf Changes
  const handlePublishShelf = useCallback(
    async (updatedShelf: ShelfDefinition) => {
      const nextShelves = shelves.map((s) => (s.id === updatedShelf.id ? { ...updatedShelf, status: "published" as const } : s));
      setShelves(nextShelves);

      const response = await fetch("/api/home-sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: nextShelves,
          action: "publish",
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to publish shelf");
      }
      setHasUnsavedDrafts(false);
      toast.success(`Published "${updatedShelf.name}" to live homepage!`);
    },
    [shelves]
  );

  // Publish Entire Layout
  const handlePublishAll = useCallback(async () => {
    const publishedShelves = shelves.map((s) => ({ ...s, status: "published" as const }));
    setShelves(publishedShelves);

    const response = await fetch("/api/home-sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sections: publishedShelves,
        action: "publish",
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Failed to publish layout");
    }
    setHasUnsavedDrafts(false);
    toast.success("Live homepage successfully published!");
  }, [shelves]);

  // Restore Defaults
  const handleRestoreDefaults = useCallback(async () => {
    const response = await fetch("/api/home-sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "restore_defaults",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to restore default shelves");
    }

    const data = await response.json();
    if (Array.isArray(data.sections)) {
      setShelves(data.sections);
    } else {
      setShelves(CANONICAL_DEFAULT_SHELVES);
    }
    setHasUnsavedDrafts(false);
    toast.success("Restored default 8 homepage shelves.");
  }, []);

  // Reorder Shelves in Manager Overview
  const handleReorderShelves = useCallback((reordered: ShelfDefinition[]) => {
    setShelves(reordered);
    setHasUnsavedDrafts(true);
    // Auto-save draft position update
    void fetch("/api/home-sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sections: reordered,
        action: "save_draft",
      }),
    });
  }, []);

  // Toggle Visibility
  const handleToggleVisibility = useCallback(
    (shelfId: string) => {
      const nextShelves = shelves.map((s) =>
        s.id === shelfId ? { ...s, isActive: !s.isActive, status: "draft" as const } : s
      );
      setShelves(nextShelves);
      setHasUnsavedDrafts(true);
      void fetch("/api/home-sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: nextShelves,
          action: "save_draft",
        }),
      });
      const target = nextShelves.find((s) => s.id === shelfId);
      toast.info(`Shelf "${target?.name}" is now ${target?.isActive ? "visible" : "hidden"}.`);
    },
    [shelves]
  );

  // Duplicate Shelf
  const handleDuplicateShelf = useCallback(
    (shelfId: string) => {
      const original = shelves.find((s) => s.id === shelfId);
      if (!original) return;

      const duplicateId = `${original.id}-copy-${Date.now().toString(36)}`;
      const duplicate: ShelfDefinition = {
        ...original,
        id: duplicateId,
        name: `${original.name} (Copy)`,
        title: `${original.title} (Copy)`,
        status: "draft",
        isCustom: true,
        updatedAt: new Date().toISOString(),
      };

      const originalIndex = shelves.findIndex((s) => s.id === shelfId);
      const nextShelves = [...shelves];
      nextShelves.splice(originalIndex + 1, 0, duplicate);

      setShelves(nextShelves);
      setHasUnsavedDrafts(true);
      void fetch("/api/home-sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: nextShelves,
          action: "save_draft",
        }),
      });
      toast.success(`Duplicated "${original.name}".`);
    },
    [shelves]
  );

  // Delete Custom Shelf
  const handleDeleteShelf = useCallback(
    (shelfId: string) => {
      const nextShelves = shelves.filter((s) => s.id !== shelfId);
      setShelves(nextShelves);
      setHasUnsavedDrafts(true);
      void fetch("/api/home-sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: nextShelves,
          action: "save_draft",
        }),
      });
      toast.success("Custom shelf deleted.");
    },
    [shelves]
  );

  // Create New Shelf
  const handleCreateNewShelf = useCallback(
    (newShelf: ShelfDefinition) => {
      const nextShelves = [...shelves, newShelf];
      setShelves(nextShelves);
      setHasUnsavedDrafts(true);
      void fetch("/api/home-sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: nextShelves,
          action: "save_draft",
        }),
      });
      toast.success(`Created "${newShelf.name}".`);
      setEditingShelfId(newShelf.id);
    },
    [shelves]
  );

  const currentlyEditingShelf = shelves.find((s) => s.id === editingShelfId);

  // Loading skeleton state
  if (!layoutLoaded && (isPropsLoading || isProjsLoading)) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 flex flex-col items-center justify-center space-y-4 text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-spin">
          <div className="w-4 h-4 rounded-full bg-amber-500" />
        </div>
        <p className="font-bold text-sm">Loading ROAD Visual Shelf Builder...</p>
      </div>
    );
  }

  // If a shelf is actively selected for editing, open the 3-panel Visual Workspace
  if (currentlyEditingShelf) {
    return (
      <ShelfEditor
        shelf={currentlyEditingShelf}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublishShelf}
        onBack={() => setEditingShelfId(null)}
        allProperties={properties}
        allProjects={projects}
      />
    );
  }

  // Otherwise, render the Shelf Manager Overview
  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <ShelfManagerOverview
        shelves={shelves}
        onEditShelf={(id) => setEditingShelfId(id)}
        onReorderShelves={handleReorderShelves}
        onToggleVisibility={handleToggleVisibility}
        onDuplicateShelf={handleDuplicateShelf}
        onDeleteShelf={handleDeleteShelf}
        onRestoreDefaults={handleRestoreDefaults}
        onPublishAll={handlePublishAll}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        hasUnsavedDrafts={hasUnsavedDrafts}
      />

      <CustomShelfModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateShelf={handleCreateNewShelf}
        existingShelves={shelves}
      />
    </div>
  );
}
