import { z } from "zod";
import { validMeasurements, validBoundaryMeasurement } from "@/lib/listing-quality";
const boundary = z.string().trim().max(250).refine(validBoundaryMeasurement, "Include a positive boundary measurement and units.");
export const verificationEvidenceSchema = z.object({
  crdaLpNumber: z.string().trim().min(3).max(150).refine(value => !/demo|placeholder|sample/i.test(value), "Enter the official LP number."),
  surveyNumber: z.string().trim().min(1).max(150).refine(value => !/demo|placeholder|sample/i.test(value), "Enter the official survey number."),
  plotDimensions: z.string().refine(validMeasurements, "Enter positive width × depth with units."),
  north: boundary, south: boundary, east: boundary, west: boundary,
  borewell: z.enum(["yes", "no", "unknown"]), electricity: z.enum(["yes", "no", "unknown"]),
  facing: z.enum(["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"]),
  roadWidth: z.number().positive().max(1000),
  documentPath: z.string().min(1).max(500),
}).strict();
