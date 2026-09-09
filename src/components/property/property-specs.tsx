"use client";

import { useState } from "react";
import { Maximize2, ChevronDown, ChevronUp, Bed, Bath, Compass, Zap, Droplets, Car, Layers, Armchair } from "lucide-react";
import type { Property } from "@/types/property";
import { resolvePropertySpecifications } from "@/lib/property-specifications";

interface PropertySpecsProps {
  property: Property;
}

export function PropertySpecs({ property }: PropertySpecsProps) {
  const [showAllMobile, setShowAllMobile] = useState(false);
  const specs = resolvePropertySpecifications(property).map(spec => ({ ...spec, icon: /bedroom/i.test(spec.label) ? Bed : /bathroom/i.test(spec.label) ? Bath : /facing/i.test(spec.label) ? Compass : /electricity/i.test(spec.label) ? Zap : /water|borewell/i.test(spec.label) ? Droplets : /parking/i.test(spec.label) ? Car : /floor/i.test(spec.label) ? Layers : /furnished/i.test(spec.label) ? Armchair : Maximize2 }));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {specs.map((spec, i) => {
        const Icon = spec.icon;
        return (
          <div
            key={i} 
            className={`${i >= 5 && !showAllMobile ? "hidden min-[480px]:flex" : "flex"} min-h-[92px] items-center gap-2.5 p-3 rounded-2xl !bg-white border border-slate-200 hover:border-amber-500/60 transition-colors shadow-sm`}
          >
            <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-300 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-normal font-extrabold !text-[#64748b] leading-tight break-words">
                {spec.label}
              </p>
              <p className="font-extrabold !text-[#0f172a] text-[13px] sm:text-sm break-words mt-1 leading-snug opacity-100">
                {spec.value}
              </p>
            </div>
          </div>
        );
      })}

      {specs.length > 5 && (
        <button
          type="button"
          aria-expanded={showAllMobile}
          onClick={() => setShowAllMobile((current) => !current)}
          className="col-span-2 min-[480px]:hidden flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm font-extrabold text-amber-700 transition-colors hover:bg-amber-500/15 dark:text-amber-400"
        >
          <span>{showAllMobile ? "Show fewer specifications" : `View ${specs.length - 5} more specifications`}</span>
          {showAllMobile ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
