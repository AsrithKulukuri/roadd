"use client";

import React, { useState } from "react";
import {
  Type,
  Square,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check,
  Palette,
  RotateCcw,
} from "lucide-react";
import type {
  CardElementId,
  ElementConfig,
  BorderConfig,
  TypographyConfig,
  BorderPreset,
  FontWeightNumeric,
  TextTransform,
  TextAlign,
} from "@/types/shelf-builder";
import {
  APPROVED_FONTS,
  APPROVED_WEIGHTS,
  DEFAULT_BORDER_PRESETS,
  DEFAULT_ELEMENT_ORDER,
  DEFAULT_ELEMENTS_CONFIG,
} from "@/lib/shelf-builder-defaults";
import { cn } from "@/lib/utils";

interface ElementInspectorProps {
  selectedElementId: CardElementId;
  onSelectElement: (id: CardElementId) => void;
  elements: Partial<Record<CardElementId, ElementConfig>>;
  onChangeElement: (id: CardElementId, updated: Partial<ElementConfig>) => void;
  elementOrder: CardElementId[];
  onChangeElementOrder: (newOrder: CardElementId[]) => void;
  cardBorder?: BorderConfig;
  onChangeCardBorder: (updated: BorderConfig) => void;
  onApplyBorderToAllCards?: (border: BorderConfig) => void;
}

const ELEMENT_LABELS: Record<CardElementId, { name: string; desc: string }> = {
  container: { name: "Card Container", desc: "Outer box, background, and card borders" },
  image: { name: "Primary Image", desc: "Cover photograph and aspect ratio" },
  image_secondary: { name: "Secondary Image", desc: "Split/interior photograph" },
  badge: { name: "Status Badge", desc: "Floating badge (e.g. Featured, New Launch)" },
  price: { name: "Price Display", desc: "Listing price and currency presentation" },
  title: { name: "Property Title", desc: "Headline name of property or project" },
  subtitle: { name: "Subtitle / Tagline", desc: "Editorial description or caption" },
  location: { name: "Location Label", desc: "Locality, city, and map pin icon" },
  specs: { name: "Specifications Box", desc: "BHK, Carpet area, and property type" },
  developer: { name: "Developer / Partner", desc: "Builder logo and verified tag" },
  progress: { name: "Progress Indicator", desc: "Construction completion bar" },
  cta: { name: "CTA Action Button", desc: "Explore / View Details button" },
  divider: { name: "Section Divider", desc: "Horizontal separation line" },
};

export function ElementInspector({
  selectedElementId,
  onSelectElement,
  elements,
  onChangeElement,
  elementOrder,
  onChangeElementOrder,
  cardBorder,
  onChangeCardBorder,
  onApplyBorderToAllCards,
}: ElementInspectorProps) {
  const [activeTab, setActiveTab] = useState<"typography" | "border" | "layout">("border");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isContainer = selectedElementId === "container";

  // Current element config or sensible fallback
  const elementConfig: ElementConfig = elements[selectedElementId] || {
    id: selectedElementId,
    label: ELEMENT_LABELS[selectedElementId]?.name || selectedElementId,
    visible: true,
    typography: DEFAULT_ELEMENTS_CONFIG[selectedElementId]?.typography || {
      fontFamily: "Inter",
      fontSize: 14,
      fontSizeUnit: "px",
      fontWeight: 500,
      textColor: "#0f172a",
    },
    border: isContainer ? cardBorder : DEFAULT_ELEMENTS_CONFIG[selectedElementId]?.border,
  };

  const currentTypo: TypographyConfig = elementConfig.typography || {
    fontFamily: "Inter",
    fontSize: 14,
    fontSizeUnit: "px",
    fontWeight: 500,
    textColor: "#0f172a",
  };

  const currentBorder: BorderConfig = isContainer
    ? (cardBorder || {
        enabled: true,
        style: "solid",
        color: "#e2e8f0",
        width: 1,
        radius: 16,
        linkCorners: true,
        shadow: "sm",
      })
    : (elementConfig.border || {
        enabled: false,
        style: "solid",
        color: "#e2e8f0",
        width: 1,
        radius: 8,
        linkCorners: true,
      });

  const updateTypo = (updates: Partial<TypographyConfig>) => {
    onChangeElement(selectedElementId, {
      typography: {
        ...currentTypo,
        ...updates,
      },
    });
  };

  const updateBorder = (updates: Partial<BorderConfig>) => {
    const nextBorder: BorderConfig = {
      ...currentBorder,
      ...updates,
    };
    if (isContainer) {
      onChangeCardBorder(nextBorder);
    } else {
      onChangeElement(selectedElementId, {
        border: nextBorder,
      });
    }
  };

  const applyPreset = (preset: BorderPreset) => {
    updateBorder(preset.config);
    showToast(`Applied preset "${preset.name}"`);
  };

  const moveElement = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= elementOrder.length) return;
    const newOrder = [...elementOrder];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(newIndex, 0, moved);
    onChangeElementOrder(newOrder);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 select-none">
      {/* Toast alert */}
      {toastMessage && (
        <div className="bg-amber-500 text-slate-950 text-xs font-bold px-3 py-1.5 text-center transition-all">
          {toastMessage}
        </div>
      )}

      {/* Header with Element Switcher */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Element Inspector
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            {selectedElementId}
          </span>
        </div>

        {/* Element Selector Dropdown */}
        <select
          value={selectedElementId}
          aria-label="Select card element to inspect and edit"
          onChange={(e) => onSelectElement(e.target.value as CardElementId)}
          className="w-full text-xs font-bold py-1.5 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-amber-400"
        >
          <option value="container">📦 Card Container (Borders & Box)</option>
          <option value="image">🖼️ Primary Image</option>
          <option value="image_secondary">🖼️ Secondary Image</option>
          <option value="badge">🏷️ Status Badge</option>
          <option value="price">💰 Price & Currency</option>
          <option value="title">📝 Property Title</option>
          <option value="subtitle">💬 Subtitle / Tagline</option>
          <option value="location">📍 Location / Map Pin</option>
          <option value="specs">📐 Specifications (BHK/Area)</option>
          <option value="developer">🏢 Developer / Partner</option>
          <option value="progress">⚡ Construction Progress</option>
          <option value="cta">🔘 CTA Action Button</option>
        </select>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("border")}
          className={cn(
            "flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors border-b-2",
            activeTab === "border"
              ? "border-amber-500 text-amber-600 bg-amber-500/5"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <Square className="w-3.5 h-3.5" />
          <span>Borders</span>
        </button>

        {!isContainer && (
          <button
            type="button"
            onClick={() => setActiveTab("typography")}
            className={cn(
              "flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors border-b-2",
              activeTab === "typography"
                ? "border-amber-500 text-amber-600 bg-amber-500/5"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Typography</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("layout")}
          className={cn(
            "flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors border-b-2",
            activeTab === "layout"
              ? "border-amber-500 text-amber-600 bg-amber-500/5"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Ordering</span>
        </button>
      </div>

      {/* Tab Contents (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 1: BORDERS & OUTLINE */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === "border" && (
          <div className="space-y-4">
            {/* Presets Grid */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Design Presets
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {DEFAULT_BORDER_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="p-2 rounded-xl text-left border border-slate-200 dark:border-slate-800 hover:border-amber-400 bg-slate-50 dark:bg-slate-800/40 hover:bg-amber-50/20 transition-all cursor-pointer"
                  >
                    <span className="font-extrabold block text-slate-900 dark:text-white truncate">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize">
                      {p.config.enabled ? `${p.config.width}px ${p.config.style}` : "None"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Border Enable Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="font-extrabold text-slate-900 dark:text-white">Enable Border</span>
              <input
                type="checkbox"
                checked={currentBorder.enabled}
                onChange={(e) => updateBorder({ enabled: e.target.checked })}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>

            {currentBorder.enabled && (
              <>
                {/* Border Style & Width */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Border Style
                    </label>
                    <select
                      value={currentBorder.style}
                      aria-label="Border Style"
                      onChange={(e) => updateBorder({ style: e.target.value as any })}
                      className="w-full py-1.5 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                      <option value="double">Double</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-500">Thickness</label>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {currentBorder.width}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={0.5}
                      aria-label="Border thickness in pixels"
                      value={currentBorder.width}
                      onChange={(e) => updateBorder({ width: Number.parseFloat(e.target.value) })}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>

                {/* Border Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-500">Border Color</label>
                    <span className="font-mono uppercase text-slate-700 dark:text-slate-300">
                      {currentBorder.color}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Border Color picker"
                      value={currentBorder.color.startsWith("#") ? currentBorder.color : "#e2e8f0"}
                      onChange={(e) => updateBorder({ color: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      aria-label="Border Color hex code"
                      value={currentBorder.color}
                      onChange={(e) => updateBorder({ color: e.target.value })}
                      className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                {/* Corner Radii */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">Corner Radius</span>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentBorder.linkCorners !== false}
                        onChange={(e) => updateBorder({ linkCorners: e.target.checked })}
                        className="accent-amber-500"
                      />
                      <span>Link all corners</span>
                    </label>
                  </div>

                  {currentBorder.linkCorners !== false ? (
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-500">Uniform Radius</span>
                        <span className="font-mono font-bold">{currentBorder.radius}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        step={1}
                        aria-label="Uniform corner radius"
                        value={currentBorder.radius}
                        onChange={(e) => updateBorder({ radius: Number.parseInt(e.target.value) })}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500">Top-Left</span>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          aria-label="Top-Left corner radius"
                          value={currentBorder.radiusTopLeft ?? currentBorder.radius}
                          onChange={(e) => updateBorder({ radiusTopLeft: Number(e.target.value) })}
                          className="w-full mt-0.5 py-1 px-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500">Top-Right</span>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          aria-label="Top-Right corner radius"
                          value={currentBorder.radiusTopRight ?? currentBorder.radius}
                          onChange={(e) => updateBorder({ radiusTopRight: Number(e.target.value) })}
                          className="w-full mt-0.5 py-1 px-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500">Bottom-Left</span>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          aria-label="Bottom-Left corner radius"
                          value={currentBorder.radiusBottomLeft ?? currentBorder.radius}
                          onChange={(e) => updateBorder({ radiusBottomLeft: Number(e.target.value) })}
                          className="w-full mt-0.5 py-1 px-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500">Bottom-Right</span>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          aria-label="Bottom-Right corner radius"
                          value={currentBorder.radiusBottomRight ?? currentBorder.radius}
                          onChange={(e) => updateBorder({ radiusBottomRight: Number(e.target.value) })}
                          className="w-full mt-0.5 py-1 px-2 border rounded-md"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Outline Controls */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">Outline</span>
                    <input
                      type="checkbox"
                      checked={Boolean(currentBorder.outlineEnabled)}
                      onChange={(e) => updateBorder({ outlineEnabled: e.target.checked })}
                      className="accent-amber-500 cursor-pointer"
                    />
                  </div>
                  {currentBorder.outlineEnabled && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] text-slate-500">Width</label>
                        <input
                          type="number"
                          min={1}
                          max={8}
                          aria-label="Outline width in pixels"
                          value={currentBorder.outlineWidth || 2}
                          onChange={(e) => updateBorder({ outlineWidth: Number(e.target.value) })}
                          className="w-full py-1 px-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500">Offset</label>
                        <input
                          type="number"
                          min={0}
                          max={8}
                          aria-label="Outline offset in pixels"
                          value={currentBorder.outlineOffset || 2}
                          onChange={(e) => updateBorder({ outlineOffset: Number(e.target.value) })}
                          className="w-full py-1 px-2 border rounded-md"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Shadow */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Elevation Shadow
                  </label>
                  <select
                    value={currentBorder.shadow || "none"}
                    aria-label="Elevation Shadow"
                    onChange={(e) => updateBorder({ shadow: e.target.value as any })}
                    className="w-full py-1.5 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="none">No Shadow</option>
                    <option value="sm">Subtle (sm)</option>
                    <option value="md">Medium (md)</option>
                    <option value="lg">Elevated (lg)</option>
                    <option value="xl">Dramatic (xl)</option>
                    <option value="2xl">Cinematic (2xl)</option>
                    <option value="amber-glow">⭐ ROAD Amber Glow</option>
                  </select>
                </div>

                {/* Apply to all cards action */}
                {isContainer && onApplyBorderToAllCards && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyBorderToAllCards(currentBorder);
                      showToast("Border applied to all cards in this shelf!");
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply Border to All Cards in Shelf</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 2: COMPLETE TYPOGRAPHY & TEXT DESIGN */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === "typography" && !isContainer && (
          <div className="space-y-4">
            {/* Font Family Selector with Visual Previews */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Font Family
              </label>
              <div className="space-y-1.5">
                {APPROVED_FONTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => updateTypo({ fontFamily: f.id })}
                    className={cn(
                      "w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer",
                      currentTypo.fontFamily === f.id
                        ? "border-amber-500 bg-amber-500/10 text-slate-950 dark:text-white ring-1 ring-amber-400"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50 dark:bg-slate-800/40"
                    )}
                  >
                    <div>
                      <span className="font-bold text-xs block">{f.name}</span>
                      <span
                        style={{ fontFamily: f.id }}
                        className="text-[11px] text-slate-500 block mt-0.5 truncate"
                      >
                        {f.sample}
                      </span>
                    </div>
                    {currentTypo.fontFamily === f.id && (
                      <Check className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Exact Font Weight Control (100 Thin to 900 Black) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Font Weight
                </label>
                <span className="font-bold text-amber-600">
                  {currentTypo.fontWeight || 500}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {APPROVED_WEIGHTS.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => updateTypo({ fontWeight: w.value })}
                    className={cn(
                      "p-2 rounded-xl border text-center transition-all cursor-pointer",
                      currentTypo.fontWeight === w.value
                        ? "border-amber-500 bg-amber-500/10 text-amber-600 font-black ring-1 ring-amber-400"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <span style={{ fontWeight: w.value }} className="text-sm block">
                      Aa
                    </span>
                    <span className="text-[10px] block mt-0.5 leading-tight truncate">
                      {w.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Unlimited Numeric Font Size Input & Slider */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">Font Size</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={8}
                    max={72}
                    aria-label="Font size value"
                    value={currentTypo.fontSize || 14}
                    onChange={(e) => updateTypo({ fontSize: Number(e.target.value) })}
                    className="w-14 py-1 px-2 border rounded-md font-mono text-center font-bold text-xs"
                  />
                  <select
                    value={currentTypo.fontSizeUnit || "px"}
                    aria-label="Font size unit"
                    onChange={(e) => updateTypo({ fontSizeUnit: e.target.value as any })}
                    className="py-1 px-1.5 border rounded-md text-xs font-bold"
                  >
                    <option value="px">px</option>
                    <option value="rem">rem</option>
                    <option value="em">em</option>
                  </select>
                </div>
              </div>
              <input
                type="range"
                min={10}
                max={48}
                step={1}
                aria-label="Font size slider"
                value={currentTypo.fontSize || 14}
                onChange={(e) => updateTypo({ fontSize: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Text Color & Opacity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-500">Text Color</label>
                <span className="font-mono uppercase text-slate-700 dark:text-slate-300">
                  {currentTypo.textColor || "#0f172a"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Text color picker"
                  value={
                    currentTypo.textColor?.startsWith("#") ? currentTypo.textColor : "#0f172a"
                  }
                  onChange={(e) => updateTypo({ textColor: e.target.value })}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                />
                <input
                  type="text"
                  aria-label="Text color hex code"
                  value={currentTypo.textColor || "#0f172a"}
                  onChange={(e) => updateTypo({ textColor: e.target.value })}
                  className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-xs uppercase"
                />
              </div>
            </div>

            {/* Formatting & Alignment Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Text Transform</label>
                <select
                  value={currentTypo.textTransform || "none"}
                  aria-label="Text Transform"
                  onChange={(e) => updateTypo({ textTransform: e.target.value as TextTransform })}
                  className="w-full py-1.5 px-2 border rounded-lg"
                >
                  <option value="none">Normal (none)</option>
                  <option value="uppercase">UPPERCASE</option>
                  <option value="lowercase">lowercase</option>
                  <option value="capitalize">Capitalize</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Text Alignment</label>
                <select
                  value={currentTypo.textAlign || "left"}
                  aria-label="Text Alignment"
                  onChange={(e) => updateTypo({ textAlign: e.target.value as TextAlign })}
                  className="w-full py-1.5 px-2 border rounded-lg"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            {/* Spacing & Line Height */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Line Height</label>
                <input
                  type="number"
                  min={1}
                  max={2.5}
                  step={0.1}
                  aria-label="Line height"
                  value={currentTypo.lineHeight || 1.3}
                  onChange={(e) => updateTypo({ lineHeight: Number(e.target.value) })}
                  className="w-full py-1.5 px-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Letter Spacing (px)</label>
                <input
                  type="number"
                  min={-2}
                  max={6}
                  step={0.5}
                  aria-label="Letter spacing in pixels"
                  value={currentTypo.letterSpacing || 0}
                  onChange={(e) => updateTypo({ letterSpacing: Number(e.target.value) })}
                  className="w-full py-1.5 px-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Line Clamp */}
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">
                Line Clamp (Max lines before truncation)
              </label>
              <select
                value={currentTypo.lineClamp || 1}
                aria-label="Line Clamp"
                onChange={(e) => updateTypo({ lineClamp: Number(e.target.value) })}
                className="w-full py-1.5 px-2 border rounded-lg"
              >
                <option value={1}>1 Line (Truncate with ...)</option>
                <option value={2}>2 Lines</option>
                <option value={3}>3 Lines</option>
                <option value={0}>Unlimited</option>
              </select>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 3: ELEMENT ORDERING & VISIBILITY */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === "layout" && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500">
              Drag or use arrows to reorder card elements. Hide or show elements independently.
            </p>

            <div className="space-y-1.5">
              {elementOrder.map((elemId, idx) => {
                const cfg = elements[elemId];
                const isVis = cfg?.visible !== false;
                const isCurr = selectedElementId === elemId;

                return (
                  <div
                    key={elemId}
                    className={cn(
                      "p-2.5 rounded-xl border flex items-center justify-between transition-all",
                      isCurr
                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-400"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                    )}
                  >
                    <div
                      className="flex items-center gap-2 flex-1 cursor-pointer min-w-0"
                      onClick={() => onSelectElement(elemId)}
                    >
                      <span className="font-mono text-[10px] text-slate-400 w-4">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <span className="font-extrabold text-xs block text-slate-900 dark:text-white truncate">
                          {ELEMENT_LABELS[elemId]?.name || elemId}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {ELEMENT_LABELS[elemId]?.desc}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => moveElement(idx, "up")}
                        disabled={idx === 0}
                        aria-label="Move element up"
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveElement(idx, "down")}
                        disabled={idx === elementOrder.length - 1}
                        aria-label="Move element down"
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeElement(elemId, { visible: !isVis })}
                        title={isVis ? "Hide element" : "Show element"}
                        aria-label={isVis ? "Hide element" : "Show element"}
                        className={cn(
                          "p-1 rounded-md transition-colors cursor-pointer",
                          isVis
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : "text-slate-400 hover:bg-slate-200"
                        )}
                      >
                        {isVis ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
