"use client";

import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { 
  Building2, Trees, Store, Hammer, Info, Check, Sparkles, TrendingUp 
} from "lucide-react";

interface BuildSimulatorProps {
  pricePerSqYd?: number;
  projectName: string;
}

type VibeType = "villa" | "orchard" | "commercial";

interface VibeOption {
  id: VibeType;
  label: string;
  desc: string;
  icon: React.ElementType;
  estCostPerUnit: number; // cost per sqft/sqyd or setup cost
  unitLabel: string;
  costDesc: string;
}

const VIBE_OPTIONS: VibeOption[] = [
  {
    id: "villa",
    label: "Duplex Villa",
    desc: "Luxury 3 BHK duplex home with garden and parking",
    icon: Building2,
    estCostPerUnit: 2800, // per sqft builtup
    unitLabel: "sq.ft",
    costDesc: "Est. construction cost: ₹2,800/sq.ft",
  },
  {
    id: "orchard",
    label: "Organic Orchard & Farm",
    desc: "Mango/guava trees, lawn, borewell & holiday gazebo",
    icon: Trees,
    estCostPerUnit: 600, // per sqyd setup
    unitLabel: "sq.yd",
    costDesc: "Est. farming setup cost: ₹600/sq.yd",
  },
  {
    id: "commercial",
    label: "Commercial Retail Block",
    desc: "Small shopping complex with 3 retail units and parking",
    icon: Store,
    estCostPerUnit: 1800, // per sqft
    unitLabel: "sq.ft",
    costDesc: "Est. building cost: ₹1,800/sq.ft",
  },
];

export default function BuildSimulator({ pricePerSqYd = 12000, projectName }: BuildSimulatorProps) {
  const [plotSize, setPlotSize] = useState<number>(200); // default 200 sq.yds
  const [selectedVibe, setSelectedVibe] = useState<VibeType>("villa");
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [addons, setAddons] = useState<string[]>([]);

  // Addon configurations
  const addonList = useMemo(() => {
    if (selectedVibe === "villa") {
      return [
        { id: "pool", label: "Private Splash Pool", price: 250000, desc: "Add a 15x10 pool in backyard" },
        { id: "solar", label: "5kW Solar Net Metering", price: 180000, desc: "Zero power bills" },
        { id: "automation", label: "Smart Home Automation", price: 120000, desc: "App controlled lighting & AC" },
      ];
    } else if (selectedVibe === "orchard") {
      return [
        { id: "fencing", label: "Solar Boundary Fencing", price: 65000, desc: "Protects trees from cattle" },
        { id: "drip", label: "Automated Drip Irrigation", price: 40000, desc: "App scheduled watering" },
        { id: "gazebo-up", label: "Wooden Deck Pergola Upgrade", price: 90000, desc: "Premium teakwood look" },
      ];
    } else {
      return [
        { id: "cctv", label: "High-Res CCTV Coverage", price: 50000, desc: "8 cameras with cloud storage" },
        { id: "back", label: "15 kVA Diesel Generator", price: 220000, desc: "Automatic power backup" },
        { id: "sign", label: "Frontage LED Facade Signage", price: 75000, desc: "Increases visibility for tenants" },
      ];
    }
  }, [selectedVibe]);

  const activeVibe = VIBE_OPTIONS.find((v) => v.id === selectedVibe)!;

  // Reset addons when switching vibes
  const handleVibeChange = (vibe: VibeType) => {
    setSelectedVibe(vibe);
    setAddons([]);
  };

  const toggleAddon = (id: string) => {
    setAddons((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Calculations
  const calculations = useMemo(() => {
    const plotCost = plotSize * pricePerSqYd;
    let builtUpArea = 0;
    let constructionCost = 0;

    if (selectedVibe === "villa") {
      // Duplex: builtup is roughly 1.5x plot size (converted to sqft: 1 sqyd = 9 sqft)
      const plotSqFt = plotSize * 9;
      builtUpArea = Math.round(plotSqFt * 0.65 * 2); // 65% footprint * 2 floors
      constructionCost = builtUpArea * activeVibe.estCostPerUnit;
    } else if (selectedVibe === "orchard") {
      builtUpArea = 0;
      constructionCost = plotSize * activeVibe.estCostPerUnit; // simple landscaping/farming setup per sqyd
    } else if (selectedVibe === "commercial") {
      const plotSqFt = plotSize * 9;
      builtUpArea = Math.round(plotSqFt * 0.7); // 70% footprint single floor
      constructionCost = builtUpArea * activeVibe.estCostPerUnit;
    }

    const addonsCost = addons.reduce((sum, id) => {
      const add = addonList.find((a) => a.id === id);
      return sum + (add?.price || 0);
    }, 0);

    const totalCost = plotCost + constructionCost + addonsCost;
    const estAppreciationYearly = plotCost * 0.12; // 12% appreciation typical for ventures
    const monthlyIncome = selectedVibe === "commercial" 
      ? Math.round(builtUpArea * 18) // ₹18 per sqft commercial rent
      : selectedVibe === "villa"
      ? Math.round(builtUpArea * 10) // ₹10 per sqft villa rent
      : Math.round(plotSize * 15); // ₹15 per sqyd organic yield equiv

    return {
      plotCost,
      builtUpArea,
      constructionCost,
      addonsCost,
      totalCost,
      estAppreciationYearly,
      monthlyIncome,
    };
  }, [plotSize, selectedVibe, addons, pricePerSqYd, activeVibe, addonList]);

  // Format Helper
  const formatLakhOrCrore = (num: number) => {
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
    return `₹${num.toLocaleString("en-IN")}`;
  };

  return (
    <div className="bg-white dark:bg-bg-card border border-border-default rounded-3xl p-5 sm:p-6 space-y-6 shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default/50 pb-5">
        <div>
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-amber-primary" />
            Land-Use & Build Simulator
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Visualize how to design your plot inside {projectName}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-primary/10 border border-amber-primary/20 text-amber-primary px-3 py-1.5 rounded-full text-xs font-semibold self-start sm:self-center">
          <TrendingUp className="w-3.5 h-3.5" />
          ~12% YoY Area Growth
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column Controls */}
        <div className="lg:col-span-5 space-y-5">
          {/* Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-text-primary">Plot Size</span>
              <span className="text-sm font-bold text-amber-primary bg-amber-primary/10 px-2 py-0.5 rounded-lg border border-amber-primary/25">
                {plotSize} sq.yds
              </span>
            </div>
            <Slider
              value={[plotSize]}
              min={120}
              max={500}
              step={10}
              onValueChange={(val) => setPlotSize(val[0])}
              className="py-2"
            />
            <div className="flex justify-between text-[10px] text-text-tertiary">
              <span>Min: 120 sq.yds</span>
              <span>Max: 500 sq.yds</span>
            </div>
          </div>

          {/* Vibe Selection Options */}
          <div className="space-y-2.5">
            <span className="text-sm font-semibold text-text-primary block">Select Land Layout</span>
            <div className="grid grid-cols-1 gap-2">
              {VIBE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = selectedVibe === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleVibeChange(opt.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all relative ${
                      active
                        ? "border-amber-primary bg-amber-primary/5 shadow-inner"
                        : "border-border-default bg-bg-primary hover:border-amber-primary/30"
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${active ? "bg-amber-primary text-slate-950" : "bg-bg-card text-text-secondary"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-text-primary">{opt.label}</p>
                      <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5 line-clamp-1">{opt.desc}</p>
                      <p className="text-[10px] font-semibold text-amber-primary mt-1">{opt.costDesc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Addons Accordion */}
          <div className="border border-border-default rounded-2xl p-4 space-y-3 bg-bg-primary/50">
            <button
              onClick={() => setCustomizerOpen(!customizerOpen)}
              className="w-full flex items-center justify-between text-xs font-bold text-text-secondary uppercase tracking-wider"
            >
              <span>⚙️ Design Upgrades &amp; Add-ons</span>
              <span className="text-amber-primary text-[10px]">{customizerOpen ? "Collapse ▴" : "Expand ▾"}</span>
            </button>
            
            {customizerOpen && (
              <div className="space-y-2 pt-1.5 border-t border-border-default/50">
                {addonList.map((addon) => {
                  const selected = addons.includes(addon.id);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddon(addon.id)}
                      className={`flex items-start justify-between gap-3 p-2.5 rounded-xl border cursor-pointer select-none transition-colors ${
                        selected
                          ? "border-amber-primary bg-amber-primary/10"
                          : "border-border-default/80 bg-bg-card hover:bg-bg-primary"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                          {selected && <Check className="w-3 h-3 text-amber-primary shrink-0" />}
                          {addon.label}
                        </p>
                        <p className="text-[10px] text-text-tertiary mt-0.5 line-clamp-1">{addon.desc}</p>
                      </div>
                      <span className="text-xs font-bold text-amber-primary shrink-0">
                        +₹{(addon.price / 100000).toFixed(1)}L
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center SVG Design Blueprint Canvas */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex-1 min-h-[280px] bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col relative overflow-hidden shadow-inner">
            <span className="absolute top-3 left-3 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50 backdrop-blur-sm z-10 flex items-center gap-1">
              <Hammer className="w-3 h-3 text-amber-primary" /> Layout Blueprint
            </span>
            
            <div className="flex-1 w-full flex items-center justify-center pt-5">
              {/* Dynamic SVG Blueprint */}
              <svg viewBox="0 0 400 300" className="w-full max-w-[340px] aspect-[4/3] drop-shadow-2xl">
                {/* Boundary box */}
                <rect x="10" y="10" width="380" height="280" rx="16" fill="#1e293b" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />
                <text x="200" y="275" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="700">PLOT SIZE: {plotSize} SQ.YDS</text>

                {/* Road frontage */}
                <rect x="0" y="240" width="400" height="60" fill="#334155" opacity="0.3" />
                <line x1="0" y1="240" x2="400" y2="240" stroke="#64748b" strokeWidth="2" />
                <text x="200" y="258" textAnchor="middle" fill="#94a3b8" fontSize="8" letterSpacing="2">MAIN VENTURE AVENUE ROAD</text>

                {/* Plot boundary lines */}
                <rect x="30" y="30" width="340" height="190" fill="#0f172a" rx="10" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.4" />

                {/* Vibe Render Layer */}
                {selectedVibe === "villa" && (
                  <>
                    {/* Villa Blueprint footprint */}
                    <rect x="60" y="50" width="180" height="140" fill="#f59e0b" fillOpacity="0.08" rx="8" stroke="#f59e0b" strokeWidth="2" />
                    
                    {/* Living area block */}
                    <rect x="70" y="60" width="90" height="70" fill="#f59e0b" fillOpacity="0.15" rx="4" stroke="#f59e0b" strokeWidth="1" />
                    <text x="115" y="100" textAnchor="middle" fill="#fde047" fontSize="10" fontWeight="600">LIVING ROOM</text>

                    {/* Master bed block */}
                    <rect x="170" y="60" width="60" height="80" fill="#3b82f6" fillOpacity="0.1" rx="4" stroke="#3b82f6" strokeWidth="1" />
                    <text x="200" y="105" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="600">M. BEDROOM</text>

                    {/* Dining/Kitchen */}
                    <rect x="70" y="140" width="80" height="40" fill="#10b981" fillOpacity="0.1" rx="4" stroke="#10b981" strokeWidth="1" />
                    <text x="110" y="163" textAnchor="middle" fill="#6ee7b7" fontSize="9" fontWeight="600">KITCHEN</text>

                    {/* Foyer / Entry */}
                    <rect x="160" y="150" width="70" height="30" fill="#8b5cf6" fillOpacity="0.1" rx="4" stroke="#8b5cf6" strokeWidth="1" />
                    <text x="195" y="168" textAnchor="middle" fill="#c084fc" fontSize="9" fontWeight="600">FOYER</text>

                    {/* Lawn area */}
                    <rect x="250" y="50" width="110" height="80" fill="#10b981" fillOpacity="0.2" rx="8" />
                    <circle cx="280" cy="90" r="12" fill="#047857" opacity="0.4" />
                    <circle cx="330" cy="75" r="8" fill="#047857" opacity="0.4" />
                    <text x="305" y="95" textAnchor="middle" fill="#a7f3d0" fontSize="9" fontWeight="700">LAWN / GARDEN</text>

                    {/* Driveway / Parking */}
                    <rect x="250" y="140" width="110" height="70" fill="#475569" fillOpacity="0.4" rx="8" />
                    <text x="305" y="180" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="700">CAR PORT</text>

                    {/* Pool addon */}
                    {addons.includes("pool") && (
                      <rect x="260" y="60" width="90" height="40" fill="#06b6d4" fillOpacity="0.6" rx="6" stroke="#22d3ee" strokeWidth="1.5" />
                    )}
                  </>
                )}

                {selectedVibe === "orchard" && (
                  <>
                    {/* Orchard Layout - Green/Brown Theme */}
                    {/* Soil base */}
                    <rect x="30" y="30" width="340" height="190" fill="#78350f" fillOpacity="0.1" rx="10" />

                    {/* Gazebo/deck block */}
                    <rect x="260" y="50" width="90" height="70" fill="#d97706" fillOpacity="0.2" rx="8" stroke="#d97706" strokeWidth="2" />
                    <text x="305" y="90" textAnchor="middle" fill="#fcd34d" fontSize="9" fontWeight="700">HOLIDAY GAZEBO</text>

                    {/* Borewell */}
                    <circle cx="65" cy="65" r="14" fill="#0284c7" fillOpacity="0.2" stroke="#0ea5e9" strokeWidth="1.5" />
                    <text x="65" y="68" textAnchor="middle" fill="#e0f2fe" fontSize="7" fontWeight="800">WATER</text>

                    {/* Trees grids (changes count based on plot size) */}
                    <circle cx="70" cy="140" r="18" fill="#10b981" fillOpacity="0.3" stroke="#10b981" strokeWidth="1" />
                    <text x="70" y="143" textAnchor="middle" fill="#6ee7b7" fontSize="8">Mango</text>

                    <circle cx="130" cy="140" r="18" fill="#10b981" fillOpacity="0.3" stroke="#10b981" strokeWidth="1" />
                    <text x="130" y="143" textAnchor="middle" fill="#6ee7b7" fontSize="8">Mango</text>

                    <circle cx="190" cy="140" r="18" fill="#10b981" fillOpacity="0.3" stroke="#10b981" strokeWidth="1" />
                    <text x="190" y="143" textAnchor="middle" fill="#6ee7b7" fontSize="8">Guava</text>

                    <circle cx="250" cy="140" r="18" fill="#10b981" fillOpacity="0.3" stroke="#10b981" strokeWidth="1" />
                    <text x="250" y="143" textAnchor="middle" fill="#6ee7b7" fontSize="8">Guava</text>

                    {/* Add extra trees for larger plots */}
                    {plotSize >= 200 && (
                      <>
                        <circle cx="70" cy="195" r="18" fill="#10b981" fillOpacity="0.3" stroke="#10b981" strokeWidth="1" />
                        <circle cx="130" cy="195" r="18" fill="#10b981" fillOpacity="0.3" stroke="#10b981" strokeWidth="1" />
                        <circle cx="190" cy="195" r="18" fill="#10b981" fillOpacity="0.3" stroke="#10b981" strokeWidth="1" />
                        <text x="130" y="198" textAnchor="middle" fill="#6ee7b7" fontSize="8">Lemon</text>
                      </>
                    )}
                    {plotSize >= 300 && (
                      <>
                        <circle cx="310" cy="150" r="18" fill="#10b981" fillOpacity="0.3" stroke="#10b981" strokeWidth="1" />
                        <circle cx="310" cy="195" r="18" fill="#10b981" fillOpacity="0.3" stroke="#10b981" strokeWidth="1" />
                        <text x="310" y="176" textAnchor="middle" fill="#6ee7b7" fontSize="8">Sapodilla</text>
                      </>
                    )}

                    {/* Lawn walk path */}
                    <path d="M 65,79 Q 150,110 260,85" fill="none" stroke="#d97706" strokeWidth="2" strokeDasharray="4 4" />

                    {/* Fencing addon */}
                    {addons.includes("fencing") && (
                      <rect x="25" y="25" width="350" height="200" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="3 3" />
                    )}
                  </>
                )}

                {selectedVibe === "commercial" && (
                  <>
                    {/* Commercial Complex Blueprint */}
                    <rect x="40" y="40" width="320" height="130" fill="#64748b" fillOpacity="0.1" rx="8" stroke="#94a3b8" strokeWidth="2" />

                    {/* Retail Shop 1 */}
                    <rect x="50" y="50" width="90" height="110" fill="#3b82f6" fillOpacity="0.15" rx="4" stroke="#3b82f6" strokeWidth="1.5" />
                    <text x="95" y="110" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="700">SHOP 1</text>

                    {/* Retail Shop 2 */}
                    <rect x="150" y="50" width="100" height="110" fill="#f59e0b" fillOpacity="0.15" rx="4" stroke="#f59e0b" strokeWidth="1.5" />
                    <text x="200" y="110" textAnchor="middle" fill="#fde047" fontSize="9" fontWeight="700">SHOP 2</text>

                    {/* Retail Shop 3 */}
                    <rect x="260" y="50" width="90" height="110" fill="#10b981" fillOpacity="0.15" rx="4" stroke="#10b981" strokeWidth="1.5" />
                    <text x="305" y="110" textAnchor="middle" fill="#6ee7b7" fontSize="9" fontWeight="700">SHOP 3</text>

                    {/* Customer parking bays */}
                    <rect x="40" y="180" width="320" height="35" fill="#475569" fillOpacity="0.3" rx="4" />
                    <line x1="120" y1="180" x2="120" y2="215" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="200" y1="180" x2="200" y2="215" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="280" y1="180" x2="280" y2="215" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
                    <text x="200" y="202" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">PARKING SPACES</text>

                    {/* LED signage addon */}
                    {addons.includes("sign") && (
                      <rect x="100" y="32" width="200" height="15" fill="#f59e0b" rx="4" />
                    )}
                  </>
                )}
              </svg>
            </div>
            
            {/* Legend info */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 bg-slate-800/40 p-2 rounded-xl border border-slate-700/30">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-amber-primary" />
                Layout adjusts in real-time as plot size changes.
              </span>
            </div>
          </div>

          {/* Pricing Analysis Cards Grid */}
          <div className="grid grid-cols-2 gap-3">
            
            <div className="bg-bg-primary/50 border border-border-default rounded-2xl p-3.5">
              <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider">Raw Plot Price</p>
              <p className="text-lg font-bold text-text-primary mt-1">
                {formatLakhOrCrore(calculations.plotCost)}
              </p>
              <p className="text-[10px] text-text-secondary mt-0.5">@{pricePerSqYd.toLocaleString("en-IN")}/sq.yd</p>
            </div>

            <div className="bg-bg-primary/50 border border-border-default rounded-2xl p-3.5">
              <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider">Construction Cost</p>
              <p className="text-lg font-bold text-text-primary mt-1">
                {formatLakhOrCrore(calculations.constructionCost)}
              </p>
              {calculations.builtUpArea > 0 ? (
                <p className="text-[10px] text-text-secondary mt-0.5">~{calculations.builtUpArea} sq.ft Built-up</p>
              ) : (
                <p className="text-[10px] text-text-secondary mt-0.5">Farming Setup &amp; Gazebo</p>
              )}
            </div>

            <div className="col-span-2 bg-amber-primary/5 border border-amber-primary/20 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-amber-800 dark:text-amber-500 uppercase font-extrabold tracking-wider">Estimated Rental / Yield Income</p>
                <p className="text-xl font-black text-amber-primary mt-1">
                  ₹{calculations.monthlyIncome.toLocaleString("en-IN")} <span className="text-xs font-semibold text-text-secondary">/ month</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-text-tertiary uppercase font-bold">Total Est. Investment</p>
                <p className="text-base font-extrabold text-text-primary mt-1">
                  {formatLakhOrCrore(calculations.totalCost)}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
