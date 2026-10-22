import { test, expect } from "@playwright/test";
import { fromSupabaseProject, toSupabaseProject } from "@/stores/projects-store";
import type { Project } from "@/types/project";

test.describe("Project Location URL & Reference ID Integrity", () => {
  test("fromSupabaseProject: does NOT invent random timestamp refId when project refId is absent", () => {
    const raw = {
      id: "proj-1792301483293",
      slug: "avenue-serene",
      name: "Avenue Serene",
      location: {
        address: "Benz Circle, Vijayawada",
        locality: "Benz Circle",
        city: "Vijayawada",
      },
    };

    const project = fromSupabaseProject(raw);
    expect(project.refId).toBeUndefined();
    expect(project.location.refId).toBeUndefined();
  });

  test("toSupabaseProject: persists refId safely in both top-level and location", () => {
    const proj: Partial<Project> = {
      id: "proj-1",
      slug: "test-proj",
      refId: "REF0005",
      location: {
        address: "Test Address",
        locality: "Test Locality",
        city: "Vijayawada",
        state: "Andhra Pradesh",
        latitude: 16.5,
        longitude: 80.6,
      },
    };

    const cleaned = toSupabaseProject(proj);
    expect(cleaned.refId).toBe("REF0005");
    expect((cleaned.location as Record<string, unknown>).refId).toBe("REF0005");
  });

  test("toSupabaseProject: persists locationUrl in both top-level and location", () => {
    const mapsUrl = "https://maps.app.goo.gl/DGzwjhofrtCZaFky9";
    const proj: Partial<Project> = {
      id: "proj-1",
      slug: "test-proj",
      locationUrl: mapsUrl,
      location: {
        address: "Test Address",
        locality: "Test Locality",
        city: "Vijayawada",
        state: "Andhra Pradesh",
        latitude: 16.5,
        longitude: 80.6,
      },
    };

    const cleaned = toSupabaseProject(proj);
    expect(cleaned.locationUrl).toBe(mapsUrl);
    expect((cleaned.location as Record<string, unknown>).locationUrl).toBe(mapsUrl);
    expect((cleaned.location as Record<string, unknown>).mapUrl).toBe(mapsUrl);
    expect((cleaned.location as Record<string, unknown>).googleMapsUrl).toBe(mapsUrl);
  });

  test("fromSupabaseProject: reconstructs locationUrl from location JSONB", () => {
    const mapsUrl = "https://maps.app.goo.gl/DGzwjhofrtCZaFky9";
    const raw = {
      id: "proj-1",
      slug: "test-proj",
      name: "Test Project",
      location: {
        address: "Test Address",
        locality: "Benz Circle",
        city: "Vijayawada",
        locationUrl: mapsUrl,
      },
    };

    const project = fromSupabaseProject(raw);
    expect(project.locationUrl).toBe(mapsUrl);
    expect(project.location.locationUrl).toBe(mapsUrl);
    expect(project.location.mapUrl).toBe(mapsUrl);
  });
});
