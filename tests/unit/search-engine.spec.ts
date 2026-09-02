import { test, expect } from "@playwright/test";
import {
  parseSearchIntent,
  matchesPropertySearch,
  matchesProjectSearch,
  evaluatePropertyFilters,
  evaluateProjectFilters,
  matchesStructuredLocation,
  hasGatedEvidenceProperty,
  hasGatedEvidenceProject,
} from "@/lib/search-engine";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";

test.describe("Search Engine Unit Tests", () => {
  test.describe("parseSearchIntent", () => {
    test("parses BHK, budget, city, property type and gated community accurately", () => {
      const intent = parseSearchIntent("3 BHK gated community villa in Guntur under 1.5 Cr");
      expect(intent.bhks).toContain(3);
      expect(intent.propertyTypes).toContain("villa");
      expect(intent.isGatedCommunity).toBe(true);
      expect(intent.locationKeywords).toContain("guntur");
      expect(intent.maxPrice).toBe(15000000);
    });

    test("parses rental query listing type", () => {
      const intent = parseSearchIntent("2 BHK flat for rent in Vijayawada");
      expect(intent.bhks).toContain(2);
      expect(intent.propertyTypes).toContain("apartment");
      expect(intent.listingType).toBe("rent");
      expect(intent.locationKeywords).toContain("vijayawada");
    });

    test("parses plot/land aliases", () => {
      const intent = parseSearchIntent("Residential plots in Amaravati under 40 lakhs");
      expect(intent.propertyTypes).toContain("residential-land");
      expect(intent.locationKeywords).toContain("amaravati");
      expect(intent.maxPrice).toBe(4000000);
    });
  });

  test.describe("Hard Location Intent vs Marketing Copy", () => {
    const kanuruPropertyWithAmaravatiDescription = {
      id: "prop-kanuru-1",
      slug: "kanuru-plot",
      title: "Prime Residential Land in Kanuru",
      description: "Fast growing area near Amaravati capital growth zone with high appreciation potential.",
      price: 3500000,
      propertyType: "residential-land",
      listingType: "sale",
      bedrooms: 0,
      bathrooms: 0,
      balconies: 0,
      area: 200,
      status: "published",
      location: {
        city: "Vijayawada",
        locality: "Kanuru",
        address: "Kanuru Main Road",
        state: "Andhra Pradesh",
        pincode: "520007",
        latitude: 16.49,
        longitude: 80.68,
      },
      images: [],
      amenities: [],
      features: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as Property;

    const actualAmaravatiProperty = {
      id: "prop-amaravati-1",
      slug: "amaravati-plot",
      title: "CRDA Approved Plot in Amaravati",
      description: "Clear title residential land in capital core.",
      price: 3800000,
      propertyType: "residential-land",
      listingType: "sale",
      bedrooms: 0,
      bathrooms: 0,
      balconies: 0,
      area: 220,
      status: "published",
      location: {
        city: "Guntur",
        locality: "Amaravati",
        address: "Thullur Village, Amaravati Capital Region",
        state: "Andhra Pradesh",
        pincode: "522237",
        latitude: 16.54,
        longitude: 80.51,
      },
      images: [],
      amenities: [],
      features: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as Property;

    test("query for 'Amaravati' rejects properties that only mention Amaravati in description", () => {
      const intent = parseSearchIntent("Residential plot in Amaravati under 40 lakhs");
      
      // Kanuru property should NOT match hard location requirement
      const matchesKanuru = matchesPropertySearch(kanuruPropertyWithAmaravatiDescription, "Residential plot in Amaravati under 40 lakhs", intent);
      expect(matchesKanuru).toBe(false);

      // Actual Amaravati property MUST match
      const matchesAmaravati = matchesPropertySearch(actualAmaravatiProperty, "Residential plot in Amaravati under 40 lakhs", intent);
      expect(matchesAmaravati).toBe(true);
    });

    test("matches Benz Circle variants via structured location aliases", () => {
      const benzProperty = {
        ...kanuruPropertyWithAmaravatiDescription,
        location: {
          ...kanuruPropertyWithAmaravatiDescription.location,
          city: "Vijayawada",
          locality: "Patamata",
          address: "Near Benz Circle, MG Road",
        },
      } as unknown as Property;
      const intent = parseSearchIntent("Flats near Benz Circle");
      const matched = matchesStructuredLocation(benzProperty.location, intent.locationKeywords);
      expect(matched).toBe(true);
    });
  });

  test.describe("Gated Community Strict Evidence", () => {
    const ordinaryApartment = {
      id: "prop-apt-1",
      slug: "ordinary-apartment",
      title: "Standard 2 BHK Flat",
      description: "Well maintained standalone flat.",
      price: 4500000,
      propertyType: "apartment",
      listingType: "sale",
      bedrooms: 2,
      bathrooms: 2,
      balconies: 1,
      area: 1100,
      status: "published",
      location: {
        city: "Guntur",
        locality: "Gorantla",
        address: "Gorantla, Guntur",
        state: "Andhra Pradesh",
      },
      images: [],
      amenities: [{ id: "lift", name: "Lift" }],
      features: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as Property;

    const gatedVilla = {
      id: "prop-villa-1",
      slug: "gated-villa",
      title: "Luxury 3 BHK Villa in Gated Community",
      description: "Premium independent villa inside 24/7 guarded township.",
      price: 12000000,
      propertyType: "villa",
      listingType: "sale",
      gatedCommunity: true,
      bedrooms: 3,
      bathrooms: 3,
      balconies: 2,
      area: 2400,
      status: "published",
      location: {
        city: "Guntur",
        locality: "Gorantla",
        address: "Gorantla, Guntur",
        state: "Andhra Pradesh",
      },
      images: [],
      amenities: [{ id: "gated-security", name: "Gated Security & CCTV" }],
      features: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as Property;

    test("ordinary apartment is not treated as gated community", () => {
      expect(hasGatedEvidenceProperty(ordinaryApartment)).toBe(false);
      expect(evaluatePropertyFilters(ordinaryApartment, { gatedCommunity: true })).toBe(false);
      
      const intent = parseSearchIntent("gated community in Guntur");
      expect(matchesPropertySearch(ordinaryApartment, "gated community in Guntur", intent)).toBe(false);
    });

    test("gated villa matches gated community search", () => {
      expect(hasGatedEvidenceProperty(gatedVilla)).toBe(true);
      expect(evaluatePropertyFilters(gatedVilla, { gatedCommunity: true })).toBe(true);

      const intent = parseSearchIntent("gated community in Guntur");
      expect(matchesPropertySearch(gatedVilla, "gated community in Guntur", intent)).toBe(true);
    });
  });

  test.describe("Rent vs Project Separation", () => {
    const testProject = {
      id: "proj-1",
      slug: "test-heights",
      name: "Test Heights",
      projectType: "apartment",
      constructionStatus: "ready-to-move",
      isPublished: true,
      location: {
        city: "Vijayawada",
        locality: "Poranki",
        address: "Poranki, Vijayawada",
        state: "AP",
        latitude: 16.5,
        longitude: 80.7,
      },
      configurations: [
        {
          id: "cfg-1",
          label: "3 BHK",
          bedrooms: 3,
          priceMin: 7500000,
          priceMax: 9000000,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as Project;

    test("project search returns false when query specifies rent", () => {
      const intent = parseSearchIntent("Apartments for rent in Vijayawada");
      expect(intent.listingType).toBe("rent");
      expect(matchesProjectSearch(testProject, "Apartments for rent in Vijayawada", intent)).toBe(false);
    });

    test("evaluateProjectFilters excludes projects when listingType or transactionType is rent", () => {
      expect(evaluateProjectFilters(testProject, { listingType: ["rent"] })).toBe(false);
      expect(evaluateProjectFilters(testProject, { transactionType: "rent" })).toBe(false);
      expect(evaluateProjectFilters(testProject, { transactionType: "buy" })).toBe(true);
    });
  });

  test.describe("New Launch Status Filtering", () => {
    const readyProject = {
      id: "proj-ready",
      slug: "ready-residency",
      name: "Ready Residency",
      projectType: "apartment",
      constructionStatus: "ready-to-move",
      isPublished: true,
      location: {
        city: "Vijayawada",
        locality: "Kanuru",
        address: "Kanuru, Vijayawada",
        state: "AP",
        latitude: 16.5,
        longitude: 80.68,
      },
      configurations: [
        { id: "cfg-r1", label: "2 BHK", bedrooms: 2, priceMin: 5000000, priceMax: 6000000 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as Project;

    const newLaunchProject = {
      id: "proj-launch",
      slug: "future-towers",
      name: "Future Towers",
      projectType: "apartment",
      constructionStatus: "new-launch",
      isPublished: true,
      location: {
        city: "Vijayawada",
        locality: "Kanuru",
        address: "Kanuru, Vijayawada",
        state: "AP",
        latitude: 16.5,
        longitude: 80.68,
      },
      configurations: [
        { id: "cfg-l1", label: "3 BHK", bedrooms: 3, priceMin: 8000000, priceMax: 9500000 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as Project;

    test("new-launch possessionStatus filter excludes ready-to-move projects", () => {
      const filters = { possessionStatus: ["new-launch"] };
      expect(evaluateProjectFilters(readyProject, filters)).toBe(false);
      expect(evaluateProjectFilters(newLaunchProject, filters)).toBe(true);
    });

    test("ready-to-move possessionStatus filter excludes new-launch projects", () => {
      const filters = { possessionStatus: ["ready-to-move"] };
      expect(evaluateProjectFilters(readyProject, filters)).toBe(true);
      expect(evaluateProjectFilters(newLaunchProject, filters)).toBe(false);
    });
  });
});
