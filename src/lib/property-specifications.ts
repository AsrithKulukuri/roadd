import type { Property, PropertyType } from "@/types/property";
import { validMeasurements } from "@/lib/listing-quality";
import { PROPERTY_CATEGORY_SCHEMA, type PropertyCategory, type PropertySubtype } from "@/lib/property-schema";

export interface Specification { label: string; value: string }

/** Keep metadata while removing specification fields belonging to another subtype. */
export function validatePropertySpecifications(property: Partial<Property>): void {
  for (const field of specificationSchema(property)) {
    const value = property.attributes?.[field.key];
    if (field.inputType === "measurement" && present(value) && !validMeasurements(value)) {
      throw new Error(`${field.label}: enter positive width × depth and a unit, for example 30 × 60 ft. Clear the field if unknown.`);
    }
    if (field.inputType === "number" && present(value) && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      throw new Error(`${field.label} must be a non-negative number.`);
    }
  }
}

export function cleanPropertySpecifications<T extends Partial<Property>>(property: T): T {
  validatePropertySpecifications(property);
  const allowed = new Set(specificationSchema(property).map(field => field.key));
  const known = new Set(Object.values(PROPERTY_CATEGORY_SCHEMA).flatMap(s => Object.values(s).flatMap(fields => fields.map(f => f.key))));
  const result = { ...property, ...specificationIdentity(property), attributes: { ...property.attributes } } as Record<string, unknown>;
  const attributes = result.attributes as Record<string, unknown>;
  for (const key of ["bedrooms", "bathrooms", "balconies", "parking", "totalFloors", "roadWidth", "carpetArea", "builtUpArea", "undividedShare"]) {
    if (allowed.has(key) && present(attributes[key])) result[key] = Number(attributes[key]);
  }
  if (present(attributes.propertyOnFloor)) result.floorNumber = Number(attributes.propertyOnFloor);
  for (const key of ["facing", "furnishing"]) if (allowed.has(key) && present(attributes[key])) result[key] = attributes[key];
  // Canonical area is sq.ft. Structured area field names carry their units.
  for (const [key, factor] of [["superBuiltUpArea", 1], ["builtUpArea", 1], ["carpetArea", 1], ["totalAreaSqyd", 9], ["totalAcres", 43560]] as const) {
    if (allowed.has(key) && Number(attributes[key]) > 0) {
      result.area = Number(attributes[key]) * factor;
      if (Number(property.price) > 0) result.pricePerSqft = Number(property.price) / Number(result.area);
      break;
    }
  }
  for (const key of known) {
    if (!allowed.has(key) && key !== "listingContext") {
      delete attributes[key];
      if (key in result) result[key] = null;
    }
  }
  return result as T;
}

export function legacyPropertyType(category: PropertyCategory, subtype: PropertySubtype): PropertyType {
  if (category === "agricultural") return subtype === "farm-house" ? "farmhouse" : "agricultural-lands";
  if (category === "industrial") return subtype === "land" ? "industrial-lands" : "buildings";
  if (category === "commercial") return subtype === "land" ? "commercial-lands" : subtype === "shop" ? "shops" : subtype === "building" ? "buildings" : "commercial-spaces";
  return subtype === "land" || subtype === "venture-plot" ? "residential-land" : subtype === "villa" ? "villa" : subtype === "house" ? "independent-house" : "apartment";
}

export function normalizeLegacyPropertyType(type: string): PropertyType {
  return ({ plot: "residential-land", commercial: "commercial-spaces", "agricultural-land": "agricultural-lands" } as Record<string, PropertyType>)[type] ?? type as PropertyType;
}

export function specificationIdentity(property: Partial<Property>) {
  const type = normalizeLegacyPropertyType(property.propertyType || "apartment");
  const category = property.category ?? (type === "agricultural-lands" || type === "farmhouse" ? "agricultural" : type === "industrial-lands" ? "industrial" : ["shops", "buildings", "commercial-spaces", "commercial-lands"].includes(type) ? "commercial" : "residential");
  const subtype = property.subtype ?? (type.includes("land") ? "land" : type === "villa" ? "villa" : type === "independent-house" ? "house" : type === "shops" ? "shop" : type === "buildings" ? "building" : type === "commercial-spaces" ? "floor" : type === "farmhouse" ? "farm-house" : "flat");
  return { category, subtype, propertyType: property.category && property.subtype ? legacyPropertyType(category, subtype) : type };
}

export function specificationSchema(property: Partial<Property>) {
  const { category, subtype } = specificationIdentity(property);
  return PROPERTY_CATEGORY_SCHEMA[category]?.[subtype] ?? [];
}

const present = (value: unknown) => value !== undefined && value !== null && value !== "";
export function resolvePropertySpecifications(property: Partial<Property>): Specification[] {
  const attrs = property.attributes ?? {};
  const direct = property as Record<string, unknown>;
  const specs: Specification[] = [];
  for (const field of specificationSchema(property)) {
    if (field.key === "listingContext") continue;
    // Explicit structured attributes take precedence over legacy columns/defaults.
    let value: unknown = attrs[field.key] ?? direct[field.key];
    if (field.key === "propertyOnFloor") value = value ?? property.floorNumber;
    if (field.key === "undividedShare") value = value ?? attrs.uds;
    if (field.key === "bedrooms") value = value ?? attrs.bhk;
    if (field.key === "uds") value = value ?? property.undividedShare;
    if (!present(value) || (Array.isArray(value) && !value.length)) continue;
    if (field.inputType === "number" && (!Number.isFinite(Number(value)) || Number(value) < 0)) continue;
    if (field.key.toLowerCase().includes("area") && Number(value) === 0) continue;
    if (field.inputType === "measurement" && typeof value === "object") {
      const m = value as Record<string, unknown>;
      if (!present(m.width) || !present(m.depth) || !present(m.unit)) continue;
      value = `${m.width} × ${m.depth} ${m.unit}`;
    }
    if (field.inputType === "measurement" && typeof value === "string" && !/\b(ft|feet|foot|m|metres?|meters?|inches?|yards?|yd)\b|['″′"]/i.test(value)) value = `${value} (unit not provided)`;
    if (typeof value === "boolean") value = value ? "Yes" : "No";
    else if (Array.isArray(value)) value = value.join(", ");
    else if (typeof value === "object") continue;
    specs.push({ label: field.label, value: String(value) });
  }
  // The legacy area contract is sq.ft; never relabel it as built-up or sq.yds.
  if (!specs.some(s => /area/i.test(s.label)) && property.area && property.area > 0) {
    specs.push({ label: "Area (sq.ft)", value: property.area.toLocaleString() });
  }
  return specs;
}
