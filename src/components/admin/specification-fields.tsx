"use client";
import type { Property } from "@/types/property";
import { specificationSchema } from "@/lib/property-specifications";
import { validMeasurements } from "@/lib/listing-quality";

export function SpecificationFields({ property, onChange }: { property: Partial<Property>; onChange: (attributes: Record<string, unknown>) => void }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{specificationSchema(property).filter(f => f.key !== "listingContext").map(field => {
    const raw = property.attributes?.[field.key] ?? (property as Record<string, unknown>)[field.key] ?? "";
    const value = field.inputType === "measurement" && typeof raw === "object" && raw !== null ? `${raw.width ?? ""} × ${raw.depth ?? ""} ${raw.unit ?? ""}` : raw;
    const invalidMeasurement = field.inputType === "measurement" && value !== "" && !validMeasurements(value);
    const set = (value: unknown) => onChange({ ...property.attributes, [field.key]: value });
    const className = "w-full rounded-xl border border-border-default bg-bg-primary p-3 text-text-primary";
    return <label key={field.key} className="text-sm space-y-1"><span>{field.label}</span>{field.options && field.inputType !== "multiselect" ? <select className={className} value={typeof value === "boolean" ? value ? "yes" : "no" : String(value)} onChange={e => set(e.target.value)}><option value="">Not provided</option>{field.options.map(option => <option key={option} value={option}>{option === "yes" ? "Yes" : option === "no" ? "No" : option}</option>)}</select> : <input className={className} type={field.inputType === "number" ? "number" : "text"} min={field.inputType === "number" ? 0 : undefined} value={Array.isArray(value) ? value.join(", ") : typeof value === "object" ? "" : String(value)} aria-invalid={invalidMeasurement || undefined} step={field.inputType === "number" ? "any" : undefined} placeholder={field.helpText} onChange={e => set(field.inputType === "multiselect" ? e.target.value.split(",").map(v => v.trim()).filter(Boolean) : e.target.value)} />}{invalidMeasurement && <span className="block text-xs text-red-500">Use positive width × depth and units, e.g. 30 × 60 ft. Leave blank if unknown.</span>}</label>;
  })}</div>;
}
