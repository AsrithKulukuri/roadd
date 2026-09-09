import { test, expect } from "@playwright/test";
import { cleanPropertySpecifications, resolvePropertySpecifications, legacyPropertyType } from "@/lib/property-specifications";
import { toSupabaseProperty, fromSupabaseProperty } from "@/stores/properties-store";
import { evaluateProjectFilters, hasGatedEvidenceProperty } from "@/lib/search-engine";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";

test("plot specifications survive persistence without apartment fields or invented values", () => {
  const plot: Partial<Property> = { propertyType: "residential-land", subtype: "venture-plot", attributes: { totalAreaSqyd: 200, measurements: "30 × 60 ft", waterSource: "bore", borewell: false, electricity: "yes", roadWidth: 40, bedrooms: 3 }, bedrooms: 3, furnishing: "furnished" };
  const saved = JSON.parse(JSON.stringify(toSupabaseProperty(cleanPropertySpecifications(plot))));
  const specs = resolvePropertySpecifications(fromSupabaseProperty(saved));
  expect(specs).toContainEqual({ label: "Water Source", value: "bore" });
  expect(specs).toContainEqual({ label: "Borewell Facility", value: "No" });
  expect(specs).toContainEqual({ label: "Measurements (Width x Depth)", value: "30 × 60 ft" });
  expect(specs.some(s => /bedroom|furnished|bathroom|floor|age/i.test(s.label))).toBe(false);
  expect(saved.attributes.bedrooms).toBeUndefined();
});

test("legacy flats preserve ground floor and missing specifications stay missing", () => {
  expect(resolvePropertySpecifications({ propertyType: "apartment" })).toEqual([]);
  const specs = resolvePropertySpecifications({ propertyType: "apartment", floorNumber: 0, bedrooms: 2, area: 1200 });
  expect(specs).toContainEqual({ label: "Property on Floor", value: "0" });
  expect(specs).toContainEqual({ label: "Bedrooms", value: "2" });
  expect(specs).toContainEqual({ label: "Area (sq.ft)", value: "1,200" });
  expect(specs.some(s => /built-up/i.test(s.label))).toBe(false);
});

test("category and subtype map consistently to legacy search types", () => {
  expect(legacyPropertyType("residential", "venture-plot")).toBe("residential-land");
  expect(legacyPropertyType("commercial", "land")).toBe("commercial-lands");
  expect(resolvePropertySpecifications({ propertyType: "agricultural-lands", attributes: { totalAcres: 2, electricity: false } })).toContainEqual({ label: "Electricity Available", value: "No" });
});

test("CRDA requires explicit approval and commercial excludes residential projects", () => {
  const project = { projectType: "venture", name: "CRDA marketing text", description: "CRDA", configurations: [], location: {}, facilities: [], highlights: [] } as unknown as Project;
  expect(evaluateProjectFilters(project, { propertyType: ["crda-ventures"] })).toBe(false);
  expect(evaluateProjectFilters({ ...project, crdaApproved: true, crdaLpNumber: "LP 42/2024", surveyNumber: "142/2B", crdaDocumentUrl: "https://example.com/lp.pdf", boundaryDimensions: { north: "30 ft", south: "30 ft", east: "60 ft", west: "60 ft" }, location: { crdaReview: { reference: "portal-ticket-1", approved: true, reviewedAt: "2026-09-09T00:00:00Z" } } } as unknown as Project, { propertyType: ["crda-ventures"] })).toBe(true);
  expect(evaluateProjectFilters({ ...project, projectType: "apartment", crdaApproved: true }, { propertyType: ["crda-ventures"] })).toBe(false);
  expect(evaluateProjectFilters(project, { propertyType: ["commercial"] })).toBe(false);
});

test("structured gated evidence respects explicit no", () => {
  expect(hasGatedEvidenceProperty({ attributes: { gatedCommunity: "yes" } } as unknown as Property)).toBe(true);
  expect(hasGatedEvidenceProperty({ attributes: { gatedCommunity: false }, gatedSecurity: true } as unknown as Property)).toBe(false);
});
