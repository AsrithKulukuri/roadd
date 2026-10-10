"use client";

import { useState, useEffect } from "react";
import {
  Layers,
  CheckCircle2,
  Clock,
  Ban,
  Plus,
  Filter,
  DollarSign,
  Building2,
  X,
  RefreshCw,
  Tag,
  Compass,
  Check,
  Edit2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { InventoryUnit } from "@/lib/project-inventory";

interface InventoryMatrixModalProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InventoryMatrixModal({
  projectId,
  projectName,
  isOpen,
  onClose,
}: InventoryMatrixModalProps) {
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "under_token" | "sold">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [facingFilter, setFacingFilter] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<InventoryUnit | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New unit form state
  const [newUnitNumber, setNewUnitNumber] = useState("");
  const [newTower, setNewTower] = useState("Tower A");
  const [newFloor, setNewFloor] = useState("3");
  const [newType, setNewType] = useState<InventoryUnit["unitType"]>("3 BHK");
  const [newFacing, setNewFacing] = useState<InventoryUnit["facing"]>("East");
  const [newSize, setNewSize] = useState("1650");
  const [newPrice, setNewPrice] = useState("6800000");

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/builder/inventory?projectId=${encodeURIComponent(projectId)}`);
      const data = await res.json();
      if (data.success) {
        setUnits(data.units || []);
        setSummary(data.summary);
      }
    } catch {
      toast.error("Failed to load inventory matrix.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
    }
  }, [isOpen, projectId]);

  const handleUpdateStatus = async (unitId: string, newStatus: "available" | "under_token" | "sold", tokenNotes?: string) => {
    try {
      const res = await fetch("/api/builder/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          unitId,
          status: newStatus,
          tokenHolderName: newStatus === "under_token" ? tokenNotes || "Token Deposited" : undefined,
          tokenNotes: newStatus === "under_token" ? "Hold active on sales desk" : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Unit status changed to ${newStatus.replace("_", " ").toUpperCase()}`);
        setSelectedUnit(null);
        fetchInventory();
      }
    } catch {
      toast.error("Status update failed.");
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitNumber.trim()) return;

    try {
      const res = await fetch("/api/builder/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          unit: {
            unitNumber: newUnitNumber.trim(),
            blockOrTower: newTower,
            floorNumber: Number(newFloor) || 1,
            unitType: newType,
            facing: newFacing,
            sizeSqFt: Number(newSize) || 1650,
            priceTotal: Number(newPrice) || 6800000,
            status: "available",
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Unit ${newUnitNumber} added to inventory!`);
        setShowAddModal(false);
        setNewUnitNumber("");
        fetchInventory();
      }
    } catch {
      toast.error("Failed to add unit.");
    }
  };

  if (!isOpen) return null;

  const filteredUnits = units.filter(u => {
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    const matchesType = typeFilter === "all" || u.unitType === typeFilter;
    const matchesFacing = facingFilter === "all" || u.facing === facingFilter;
    return matchesStatus && matchesType && matchesFacing;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      {/* 100% Solid Opaque Modal Window */}
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-slate-300 dark:border-slate-700 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Unit Inventory &amp; Plot Matrix</h3>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/50 uppercase tracking-wider">
                  Live Matrix
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">{projectName} • Manage available flats, tokens &amp; sold inventory</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs gap-1.5 h-8.5 px-3.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Unit
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Metrics */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/60 shrink-0 text-center">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Units</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{summary.totalUnits}</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-400 dark:border-emerald-700/80 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Available</span>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{summary.availableCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 dark:border-amber-700/80 shadow-xs">
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Under Token</span>
              <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{summary.tokenCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 shadow-xs">
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Sold Out</span>
              <div className="text-xl font-black text-slate-700 dark:text-slate-200 mt-0.5">{summary.soldCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Occupancy</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{summary.occupancyRate}%</div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" /> Status:
            </span>
            {(["all", "available", "under_token", "sold"] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold capitalize border-2 transition-all",
                  statusFilter === st
                    ? "bg-amber-500 text-slate-950 font-black border-amber-500 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                )}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
            >
              <option value="all">All BHK / Types</option>
              <option value="2 BHK">2 BHK</option>
              <option value="3 BHK">3 BHK</option>
              <option value="4 BHK">4 BHK</option>
              <option value="Plot">Plot</option>
            </select>

            <select
              value={facingFilter}
              onChange={e => setFacingFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
            >
              <option value="all">All Facings</option>
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="North">North</option>
              <option value="South">South</option>
            </select>
          </div>
        </div>

        {/* Grid Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950">
          {isLoading ? (
            <div className="py-20 text-center text-slate-600 dark:text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              Loading real-time inventory matrix...
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-xs font-medium">
              No units found matching selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {filteredUnits.map(unit => {
                const isAvail = unit.status === "available";
                const isToken = unit.status === "under_token";
                const isSold = unit.status === "sold";

                return (
                  <div
                    key={unit.id}
                    onClick={() => setSelectedUnit(unit)}
                    className={cn(
                      "cursor-pointer p-4 rounded-xl border-2 transition-all space-y-2 relative group hover:shadow-md",
                      isAvail
                        ? "bg-white dark:bg-slate-800 border-emerald-500 hover:border-emerald-600 shadow-sm"
                        : isToken
                        ? "bg-amber-50 dark:bg-amber-950/50 border-amber-500 hover:border-amber-600 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 opacity-95 hover:opacity-100"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "font-black text-sm",
                        isSold ? "text-slate-500 line-through" : "text-slate-900 dark:text-white"
                      )}>
                        {unit.unitNumber}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                          isAvail
                            ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                            : isToken
                            ? "bg-amber-100 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600"
                        )}
                      >
                        {isAvail ? "Available" : isToken ? "Token Hold" : "Sold"}
                      </span>
                    </div>

                    <div className="text-xs space-y-0.5 text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between font-semibold">
                        <span>{unit.unitType} • {unit.facing}</span>
                        <span className="font-bold text-slate-900 dark:text-white">{unit.sizeSqFt} sq.ft</span>
                      </div>
                      <div className={cn(
                        "text-sm font-black pt-1",
                        isAvail ? "text-emerald-700 dark:text-emerald-400" : isToken ? "text-amber-700 dark:text-amber-400" : "text-slate-500"
                      )}>
                        ₹{(unit.priceTotal / 100000).toFixed(1)} Lakhs
                      </div>
                    </div>

                    {isToken && unit.tokenHolderName && (
                      <div className="text-[10px] text-amber-800 dark:text-amber-300 font-bold truncate pt-1 border-t border-amber-200 dark:border-amber-800">
                        Hold: {unit.tokenHolderName}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 shrink-0">
          <span className="font-medium">Click any unit to toggle availability, place a hold token, or mark sold.</span>
          <Button size="sm" variant="outline" onClick={onClose} className="h-8.5 text-xs border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
            Close Grid
          </Button>
        </div>
      </div>

      {/* Selected Unit Quick Action Dialog */}
      {selectedUnit && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border-2 border-neutral-300 dark:border-zinc-700 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-neutral-200 dark:border-zinc-800 pb-3">
              <div>
                <h4 className="text-base font-black text-neutral-900 dark:text-white">{selectedUnit.unitNumber}</h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  {selectedUnit.unitType} • {selectedUnit.sizeSqFt} sq.ft • {selectedUnit.facing} Facing
                </p>
                <p className="text-sm font-black text-amber-600 dark:text-amber-400 pt-0.5">
                  ₹{(selectedUnit.priceTotal / 100000).toFixed(1)} Lakhs
                </p>
              </div>
              <button
                onClick={() => setSelectedUnit(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Change Status To:</span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedUnit.id, "available")}
                  className={cn(
                    "text-xs font-bold h-9",
                    selectedUnit.status === "available"
                      ? "bg-emerald-600 text-white font-black"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                  )}
                >
                  Available
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedUnit.id, "under_token", tokenInput || "Token Deposited")}
                  className={cn(
                    "text-xs font-bold h-9",
                    selectedUnit.status === "under_token"
                      ? "bg-amber-500 text-slate-950 font-black"
                      : "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
                  )}
                >
                  Token Hold
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedUnit.id, "sold")}
                  className={cn(
                    "text-xs font-bold h-9",
                    selectedUnit.status === "sold"
                      ? "bg-neutral-800 text-white font-black"
                      : "bg-neutral-100 text-neutral-700 border border-neutral-300 hover:bg-neutral-200"
                  )}
                >
                  Sold Out
                </Button>
              </div>
            </div>

            {selectedUnit.status !== "under_token" && (
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">Token Holder Note (Optional):</label>
                <Input
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  placeholder="e.g. Ramesh V. (Token ₹1.5L)"
                  className="h-8.5 text-xs bg-neutral-50 dark:bg-zinc-800 border-neutral-300 dark:border-zinc-700 text-neutral-900 dark:text-white"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Unit Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateUnit}
            className="bg-white dark:bg-zinc-900 border-2 border-neutral-300 dark:border-zinc-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-neutral-200 dark:border-zinc-800 pb-3">
              <h4 className="text-base font-black text-neutral-900 dark:text-white">Add Inventory Unit / Plot</h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral-700 dark:text-neutral-300">Unit Number *</label>
                <Input
                  value={newUnitNumber}
                  onChange={e => setNewUnitNumber(e.target.value)}
                  placeholder="e.g. Tower B - 504"
                  required
                  className="h-9 text-xs bg-neutral-50 dark:bg-zinc-800 border-neutral-300 dark:border-zinc-700 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 dark:text-neutral-300">Tower / Phase</label>
                <Input
                  value={newTower}
                  onChange={e => setNewTower(e.target.value)}
                  placeholder="Tower A"
                  className="h-9 text-xs bg-neutral-50 dark:bg-zinc-800 border-neutral-300 dark:border-zinc-700 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 dark:text-neutral-300">Type</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as any)}
                  className="w-full h-9 rounded-lg border border-neutral-300 dark:border-zinc-700 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-white text-xs px-2 font-semibold"
                >
                  <option value="2 BHK">2 BHK</option>
                  <option value="3 BHK">3 BHK</option>
                  <option value="4 BHK">4 BHK</option>
                  <option value="Plot">Plot</option>
                  <option value="Duplex Villa">Duplex Villa</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 dark:text-neutral-300">Facing</label>
                <select
                  value={newFacing}
                  onChange={e => setNewFacing(e.target.value as any)}
                  className="w-full h-9 rounded-lg border border-neutral-300 dark:border-zinc-700 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-white text-xs px-2 font-semibold"
                >
                  <option value="East">East</option>
                  <option value="West">West</option>
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="North-East">North-East</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 dark:text-neutral-300">Size (Sq.Ft / Sq.Yds)</label>
                <Input
                  type="number"
                  value={newSize}
                  onChange={e => setNewSize(e.target.value)}
                  className="h-9 text-xs bg-neutral-50 dark:bg-zinc-800 border-neutral-300 dark:border-zinc-700 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 dark:text-neutral-300">Total Price (₹)</label>
                <Input
                  type="number"
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                  className="h-9 text-xs bg-neutral-50 dark:bg-zinc-800 border-neutral-300 dark:border-zinc-700 text-neutral-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-zinc-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
                Save Unit
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
