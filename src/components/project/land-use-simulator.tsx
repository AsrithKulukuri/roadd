"use client";

import { useState, useMemo } from "react";
import { Ruler, TreePine, Car, Home, IndianRupee, Compass, Droplet, Sun } from "lucide-react";

interface LandUseSimulatorProps {
  minSize?: number;
  maxSize?: number;
  pricePerSqYd?: number;
}

type UseType = "standard_villa" | "premium_duplex" | "farmhouse" | "commercial";

export default function LandUseSimulator({
  minSize = 150,
  maxSize = 1000,
  pricePerSqYd = 25000,
}: LandUseSimulatorProps) {
  const [plotSize, setPlotSize] = useState<number>(Math.max(200, minSize));
  const [useType, setUseType] = useState<UseType>("standard_villa");
  const [facing, setFacing] = useState<"east" | "west" | "north" | "south">("east");

  // Construction cost logic
  const metrics = useMemo(() => {
    let coverage = 0.5; // 50% ground coverage
    let floors = 1;
    let costPerSqFt = 2500;
    
    switch (useType) {
      case "standard_villa":
        coverage = 0.55;
        floors = 1;
        costPerSqFt = 2200;
        break;
      case "premium_duplex":
        coverage = 0.6;
        floors = 2;
        costPerSqFt = 2800;
        break;
      case "farmhouse":
        coverage = 0.3; // Lot of greenery
        floors = 1;
        costPerSqFt = 2600;
        break;
      case "commercial":
        coverage = 0.8;
        floors = 2;
        costPerSqFt = 1800;
        break;
    }

    // 1 sq.yd = 9 sq.ft
    const plotSqFt = plotSize * 9;
    const footprintSqFt = plotSqFt * coverage;
    const totalBuiltUp = footprintSqFt * floors;
    
    const landCost = plotSize * pricePerSqYd;
    const constructionCost = totalBuiltUp * costPerSqFt;
    
    return {
      plotSqFt,
      footprintSqFt,
      totalBuiltUp,
      landCost,
      constructionCost,
      totalCost: landCost + constructionCost,
      coveragePct: Math.round(coverage * 100),
      openSpace: plotSqFt - footprintSqFt,
    };
  }, [plotSize, useType, pricePerSqYd]);

  const formatMoney = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div className="bg-white dark:bg-bg-card border border-border-default rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden space-y-8 mt-6">
      
      {/* Header */}
      <div className="border-b border-border-default/50 pb-5">
        <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Compass className="w-5 h-5 text-amber-primary" />
          Interactive Plot Build Simulator
        </h3>
        <p className="text-sm text-text-secondary mt-1">
          Visualize what you can build on your plot, estimate construction costs, and plan your layout.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
        
        {/* Controls - Left */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Plot Size */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-text-secondary uppercase tracking-wider block">
                Plot Size (Sq.Yds)
              </label>
              <span className="text-amber-primary font-bold bg-amber-primary/10 px-3 py-1 rounded-full text-sm">
                {plotSize} sq.yds
              </span>
            </div>
            <input
              type="range"
              min={minSize}
              max={maxSize}
              step={10}
              value={plotSize}
              onChange={(e) => setPlotSize(Number(e.target.value))}
              className="w-full h-2 bg-border-default rounded-lg appearance-none cursor-pointer accent-amber-primary"
            />
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>{minSize} sq.yds</span>
              <span>{maxSize} sq.yds</span>
            </div>
          </div>

          {/* Facing */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-text-secondary uppercase tracking-wider block">
              Vastu / Road Facing
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["east", "west", "north", "south"] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => setFacing(dir)}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold capitalize border transition-all ${
                    facing === dir
                      ? "bg-amber-primary/10 border-amber-primary text-amber-primary"
                      : "border-border-default text-text-secondary hover:bg-bg-primary"
                  }`}
                >
                  {dir}
                </button>
              ))}
            </div>
          </div>

          {/* Use Type */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-text-secondary uppercase tracking-wider block">
              Build Goal
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setUseType("standard_villa")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                  useType === "standard_villa"
                    ? "bg-amber-primary text-slate-950 border-amber-primary shadow-sm"
                    : "border-border-default bg-bg-primary text-text-secondary hover:border-amber-primary/50"
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="text-xs font-bold">Standard Villa</span>
              </button>
              <button
                onClick={() => setUseType("premium_duplex")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                  useType === "premium_duplex"
                    ? "bg-amber-primary text-slate-950 border-amber-primary shadow-sm"
                    : "border-border-default bg-bg-primary text-text-secondary hover:border-amber-primary/50"
                }`}
              >
                <Ruler className="w-5 h-5" />
                <span className="text-xs font-bold">Premium Duplex</span>
              </button>
              <button
                onClick={() => setUseType("farmhouse")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                  useType === "farmhouse"
                    ? "bg-amber-primary text-slate-950 border-amber-primary shadow-sm"
                    : "border-border-default bg-bg-primary text-text-secondary hover:border-amber-primary/50"
                }`}
              >
                <TreePine className="w-5 h-5" />
                <span className="text-xs font-bold">Farm House</span>
              </button>
              <button
                onClick={() => setUseType("commercial")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                  useType === "commercial"
                    ? "bg-amber-primary text-slate-950 border-amber-primary shadow-sm"
                    : "border-border-default bg-bg-primary text-text-secondary hover:border-amber-primary/50"
                }`}
              >
                <Car className="w-5 h-5" />
                <span className="text-xs font-bold">Commercial Shop</span>
              </button>
            </div>
          </div>
          
        </div>

        {/* Visualization & Costs - Right */}
        <div className="lg:col-span-7 flex flex-col gap-6 z-0">
          
          {/* Top-Down 2D Visualization using simple divs (abstract CSS art) */}
          <div className="flex-1 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900 rounded-3xl relative overflow-hidden flex items-center justify-center min-h-[300px]">
            {/* The Plot Container */}
            <div 
              className={`bg-stone-100 dark:bg-stone-900 border-4 border-stone-300 dark:border-stone-700 shadow-xl relative transition-all duration-700 ease-in-out`}
              style={{
                width: `${Math.min(100, (plotSize / maxSize) * 60 + 40)}%`, // Scale relative to max
                height: `${Math.min(100, (plotSize / maxSize) * 60 + 40)}%`,
                aspectRatio: '1/1.2'
              }}
            >
              {/* Road representation based on facing */}
              {facing === "east" && <div className="absolute top-0 right-[-20px] bottom-0 w-[16px] bg-slate-400 dark:bg-slate-700 rounded" />}
              {facing === "west" && <div className="absolute top-0 left-[-20px] bottom-0 w-[16px] bg-slate-400 dark:bg-slate-700 rounded" />}
              {facing === "north" && <div className="absolute top-[-20px] left-0 right-0 h-[16px] bg-slate-400 dark:bg-slate-700 rounded" />}
              {facing === "south" && <div className="absolute bottom-[-20px] left-0 right-0 h-[16px] bg-slate-400 dark:bg-slate-700 rounded" />}

              {/* House Footprint */}
              <div 
                className={`absolute bg-slate-800 dark:bg-slate-200 shadow-2xl flex items-center justify-center transition-all duration-700`}
                style={{
                  width: `${metrics.coveragePct}%`,
                  height: `${metrics.coveragePct}%`,
                  bottom: facing === "south" || facing === "east" ? "10%" : "auto",
                  top: facing === "north" || facing === "west" ? "10%" : "auto",
                  left: facing === "west" || facing === "south" ? "10%" : "auto",
                  right: facing === "east" || facing === "north" ? "10%" : "auto",
                  borderRadius: useType === "commercial" ? "0" : "8px"
                }}
              >
                <div className="text-center text-white dark:text-black">
                  <p className="text-[10px] sm:text-xs font-bold opacity-80 uppercase tracking-widest">{useType.replace("_", " ")}</p>
                  <p className="text-sm sm:text-lg font-black">{Math.round(metrics.footprintSqFt)} <span className="text-[10px] font-normal">sq.ft</span></p>
                </div>
              </div>

              {/* Garden / Open Space */}
              <div className="absolute flex gap-1 sm:gap-2 m-2">
                <TreePine className="w-4 h-4 sm:w-6 sm:h-6 text-amber-500/60" />
                <TreePine className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600/60" />
                {useType === "farmhouse" && <TreePine className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400/60" />}
              </div>

              {/* Parking */}
              {useType !== "farmhouse" && (
                <div 
                  className="absolute bg-stone-300 dark:bg-stone-700 rounded-sm flex items-center justify-center"
                  style={{
                    width: "25%",
                    height: "15%",
                    [facing]: "2%",
                    ...(facing === "east" || facing === "west" ? { bottom: "5%" } : { left: "5%" })
                  }}
                >
                  <Car className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                </div>
              )}
            </div>
            
            <div className="absolute top-3 left-3 bg-white/80 dark:bg-black/60 backdrop-blur text-[10px] font-bold px-2 py-1 rounded text-text-secondary">
              Top-Down Plan View
            </div>
          </div>

          {/* Est. Costs & Metrics */}
          <div className="bg-bg-primary rounded-3xl p-5 border border-border-default grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] font-bold text-text-tertiary uppercase mb-1">Built-Up Area</p>
              <p className="text-lg font-black text-text-primary">{Math.round(metrics.totalBuiltUp)} <span className="text-[10px] font-normal text-text-secondary">sq.ft</span></p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-tertiary uppercase mb-1">Open Space</p>
              <p className="text-lg font-black text-amber-600 dark:text-amber-500">{Math.round(metrics.openSpace)} <span className="text-[10px] font-normal text-text-secondary">sq.ft</span></p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-tertiary uppercase mb-1">Est. Build Cost</p>
              <p className="text-lg font-black text-amber-primary">{formatMoney(metrics.constructionCost)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-tertiary uppercase mb-1">Total Project Est.</p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-200">{formatMoney(metrics.totalCost)}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
