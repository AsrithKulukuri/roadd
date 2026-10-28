import { test, expect } from "@playwright/test";
import {
  seedProjectCache,
  getPreloadedProject,
  prewarmProjectMedia,
  prewarmProjectSession,
} from "../../src/lib/project-preload";

test.describe("ROAD Instant Project Loading & Preload Architecture", () => {
  test("seeds and retrieves preloaded project data instantly from memory cache", () => {
    const mockProject = {
      id: "proj_test_101",
      slug: "emerald-heights-guntur",
      name: "Emerald Heights",
      heroImage: "projects/emerald/cover.webp",
      galleryImages: [
        "projects/emerald/gallery-1.webp",
        "projects/emerald/gallery-2.webp",
        "projects/emerald/gallery-3.webp",
      ],
      builderName: "Emerald Builders",
      builderWhatsapp: "919876543210",
      builderPhone: "919876543210",
      location: {
        address: "Brodipet",
        locality: "Brodipet",
        city: "Guntur",
        state: "Andhra Pradesh",
        latitude: 16.3067,
        longitude: 80.4365,
      },
      configurations: [
        { id: "cfg-1", label: "3 BHK", priceMin: 8500000, priceMax: 9500000 },
      ],
      highlights: ["Vastu Compliant", "Near Metro"],
      constructionStatus: "under-construction" as const,
      projectType: "apartment" as const,
    };

    // Seed cache as when user clicks or hovers a project card
    seedProjectCache(mockProject);

    // Retrieve by slug
    const cachedBySlug = getPreloadedProject("emerald-heights-guntur");
    expect(cachedBySlug).toBeDefined();
    expect(cachedBySlug?.name).toBe("Emerald Heights");
    expect(cachedBySlug?.id).toBe("proj_test_101");

    // Retrieve by id
    const cachedById = getPreloadedProject("proj_test_101");
    expect(cachedById).toBeDefined();
    expect(cachedById?.slug).toBe("emerald-heights-guntur");
  });

  test("prewarmProjectMedia queues cover and first gallery images without throwing", () => {
    const mockProject = {
      id: "proj_media_test",
      slug: "golden-meadows",
      name: "Golden Meadows",
      heroImage: "projects/golden/hero.jpg",
      galleryImages: [
        "projects/golden/img1.jpg",
        "projects/golden/img2.jpg",
        "projects/golden/img3.jpg",
      ],
    };

    expect(() => {
      prewarmProjectMedia(mockProject);
    }).not.toThrow();
  });

  test("prewarmProjectSession initiates action session pre-warming without throwing", () => {
    expect(() => {
      prewarmProjectSession();
    }).not.toThrow();
  });
});

test.describe("Project Detail View Component Source Invariants", () => {
  test("verifies project-detail-view does NOT block entire page on auth session loading", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(process.cwd(), "src/components/project/project-detail-view.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Must NOT have the old blocking `if (isLoading) return <FullPageSpinner>`
    expect(content).not.toMatch(/if\s*\(\s*isLoading\s*\)\s*\{\s*return\s*\(?\s*<div[^>]*min-h-screen[^>]*animate-spin/);

    // Must use preloaded project cache fallback
    expect(content).toContain("getPreloadedProject");

    // Must include ProjectScheduleSection
    expect(content).toContain("<ProjectScheduleSection");

    // Must include initialSlot passed to ScheduleVisitModal
    expect(content).toContain("initialSlot={selectedScheduleSlot}");

    // Must include eager loading and fetchPriority="high" on hero media
    expect(content).toContain('fetchPriority="high"');
    expect(content).toContain('loading="eager"');

    // Super Built-up Area before UDS separated by pipe
    expect(content).toContain('Super Built-up Area"}{project.projectType !== "venture" && cfg.uds ? ` | UDS: ${cfg.uds} sq.yds` : ""}');
  });

  test("verifies zoomable-image-modal eliminates blocking loading overlay and includes preloading", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(process.cwd(), "src/components/ui/zoomable-image-modal.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // No hardcoded 83% or "Loading Full Plan"
    expect(content).not.toContain("Loading Full Plan");
    expect(content).not.toContain("83%");
    expect(content).not.toContain("Downloading high-resolution blueprint");

    // Preloading and swipe gestures
    expect(content).toContain("loadedCache");
    expect(content).toContain("handleTouchStart");
    expect(content).toContain("handleTouchEnd");
  });

  test("verifies project snapshot matrix shows 8 boxes with Towers after Project Type when towers exist, else 7 boxes", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(process.cwd(), "src/components/project/project-detail-view.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Must check towers existence
    expect(content).toContain("project.totalTowers");
    expect(content).toContain("hasTowers");
    expect(content).toContain("towersDisplay");
    expect(content).toContain("boxTowers");

    // When hasTowers is true, Towers is immediately after Project Type in Row 1 (8 boxes total)
    expect(content).toContain("{boxProjectType}\n                            {boxTowers}\n                            {boxTotalArea}\n                            {boxTotalUnits}");
    expect(content).toContain("{boxAvailable}\n                            {boxStatus}\n                            {boxPossession}\n                            {boxPriceRange}");

    // When hasTowers is false, original 7-box structure is preserved
    expect(content).toContain("{boxProjectType}\n                            {boxTotalArea}\n                            {boxTotalUnits}\n                            {boxAvailable}");
    expect(content).toContain("{boxStatus}\n                            {boxPossession}\n                            {boxPriceRange}");
  });
});
