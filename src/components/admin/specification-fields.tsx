"use client";
import type { Property } from "@/types/property";
import { specificationSchema } from "@/lib/property-specifications";
import { validMeasurements } from "@/lib/listing-quality";

export function SpecificationFields({
  property,
  onChange,
}: {
  property: Partial<Property>;
  onChange: (attributes: Record<string, unknown>) => void;
}) {
  const fields = specificationSchema(property).filter((f) => f.key !== "listingContext");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map((field) => {
        const raw =
          property.attributes?.[field.key] ??
          (property as Record<string, unknown>)[field.key] ??
          "";
        const value =
          field.inputType === "measurement" && typeof raw === "object" && raw !== null
            ? `${raw.width ?? ""} × ${raw.depth ?? ""} ${raw.unit ?? ""}`
            : raw;
        const invalidMeasurement =
          field.inputType === "measurement" && value !== "" && !validMeasurements(value);
        const set = (val: unknown) =>
          onChange({ ...property.attributes, [field.key]: val });

        const inputClassName =
          "w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm font-medium transition-all shadow-xs";

        return (
          <div key={field.key} className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {field.options && field.inputType !== "multiselect" ? (
              <select
                className={inputClassName}
                value={typeof value === "boolean" ? (value ? "yes" : "no") : String(value)}
                onChange={(e) => set(e.target.value)}
              >
                <option value="">Not provided</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option === "yes" ? "Yes" : option === "no" ? "No" : option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={inputClassName}
                type={field.inputType === "number" ? "number" : "text"}
                min={field.inputType === "number" ? 0 : undefined}
                value={
                  Array.isArray(value)
                    ? value.join(", ")
                    : typeof value === "object"
                    ? ""
                    : String(value)
                }
                aria-invalid={invalidMeasurement || undefined}
                step={field.inputType === "number" ? "any" : undefined}
                placeholder={field.helpText || `Enter ${field.label}...`}
                onChange={(e) =>
                  set(
                    field.inputType === "multiselect"
                      ? e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean)
                      : e.target.value
                  )
                }
              />
            )}

            {invalidMeasurement && (
              <span className="block text-xs text-red-500 font-semibold mt-1">
                Use positive width × depth and units, e.g. 30 × 60 ft. Leave blank if unknown.
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
