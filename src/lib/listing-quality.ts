import type { Property } from "@/types/property";
import type { Project } from "@/types/project";

export const measurementPattern = /^\s*\d+(?:\.\d+)?\s*[x×*]\s*\d+(?:\.\d+)?\s*(ft|feet|foot|m|metres?|meters?|inches?|yd|yards?)\s*$/i;
export function validMeasurements(value: unknown): boolean {
  if (typeof value === "string") {
    if (!measurementPattern.test(value)) return false;
    return value.split(/[x×*]/).every(part => parseFloat(part) > 0);
  }
  if (value && typeof value === "object") {
    const m = value as Record<string, unknown>;
    return validMeasurements(`${m.width} × ${m.depth} ${m.unit}`);
  }
  return false;
}

export function isLandListing(property: Partial<Property>): boolean {
  return property.subtype === "land" || property.subtype === "venture-plot" || /land|plot/.test(property.propertyType ?? "");
}

export function missingPlotDetails(property: Partial<Property>): string[] {
  if (!isLandListing(property)) return [];
  const a = property.attributes ?? {};
  const missing: string[] = [];
  const yesNo = (value: unknown) => [true, false, "yes", "no"].includes(value as boolean | string);
  if (![a.totalAreaSqyd, a.totalAcres, property.area].some(value => Number(value) > 0)) missing.push("Area with units");
  if (!validMeasurements(a.measurements)) missing.push("Dimensions with units");
  if (!yesNo(a.borewell)) missing.push("Borewell facility");
  if (!yesNo(a.electricity)) missing.push("Electricity availability");
  if (!String(a.facing ?? property.facing ?? "").trim()) missing.push("Facing");
  if (!(Number(a.roadWidth ?? property.roadWidth) > 0)) missing.push("Road width (ft)");
  return missing;
}

export interface CrdaReview {
  reference: string;
  approved: boolean;
  reviewedAt?: string;
  requested?: boolean;
}

export function needsCrdaReview(project: Partial<Project>): boolean {
  if (project.crdaApproved !== true) return false;
  if (project.projectType !== "venture") return true;
  const review = project.location?.crdaReview;
  return !review || !review.reference?.trim() || review.approved !== true || !review.reviewedAt || !Number.isFinite(Date.parse(review.reviewedAt));
}

export function isCrdaVerified(project: Partial<Project>): boolean {
  const review = project.location?.crdaReview;
  return project.projectType === "venture" && project.crdaApproved === true && Boolean(
    project.crdaLpNumber?.trim() && project.surveyNumber?.trim() && project.crdaDocumentUrl?.trim() &&
    review?.approved === true && review.reference?.trim() && review.reviewedAt
  );
}

/** Pure server-side decision: caller must authenticate an administrator first. */
export function stampCrdaReview(review: CrdaReview, approved: boolean, now: string): CrdaReview {
  if (!review.reference?.trim()) throw new Error("Enter the approval reference or document URL before recording a review.");
  return { reference: review.reference.trim(), approved, reviewedAt: now };
}
