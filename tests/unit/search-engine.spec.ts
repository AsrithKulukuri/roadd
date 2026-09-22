import { test, expect } from "@playwright/test";
import {
  parseSearchIntent,
  matchingProjectConfigurations,
  searchRelevanceScore,
  matchesPropertySearch,
  matchesProjectSearch,
  evaluatePropertyFilters,
  evaluateProjectFilters,
  matchesStructuredLocation,
  hasGatedEvidenceProperty,
  hasGatedEvidenceProject,
  levenshteinDistance,
  isFuzzyMatch,
  haversineDistanceKm,
} from "@/lib/search-engine";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";

test.describe("Search Engine Unit Tests", () => {
  test("includes resale plots in Buy filters and for-sale queries, but not rent", () => {
    const plot = {
      title: "418 Sqyards Land for Sale",
      description: "Residential plot",
      propertyType: "residential-land",
      listingType: "resale",
      saleType: "resale",
      price: 22990000,
      location: { city: "Gudavalli", locality: "Nidamanuru" },
    } as Property;

    expect(evaluatePropertyFilters(plot, { listingType: ["buy"] })).toBe(true);
    expect(evaluatePropertyFilters(plot, { listingType: ["sale"] })).toBe(true);
    expect(matchesPropertySearch(plot, "plots for sale in Nidamanuru")).toBe(true);
    expect(evaluatePropertyFilters(plot, { listingType: ["rent"] })).toBe(false);
    expect(matchesPropertySearch(plot, "plots for rent in Nidamanuru")).toBe(false);
  });

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


test("BHK text and structured filters both match label-only project configurations", () => {
  const project = { id: "serene", name: "Serene Grande", projectType: "apartment", isPublished: true, location: { locality: "Edupugallu", city: "Vijayawada" }, configurations: [{ label: "3 BHK", priceMin: 11400000, priceMax: 11400000 }] } as Project;
  for (const query of ["3bhk in edupugallu", "3 BHK in Edupugallu", "3 bedroom in edupugallu"]) {
    expect(matchesProjectSearch(project, query)).toBe(true);
    expect(evaluateProjectFilters(project, { query, bhk: ["3"] })).toBe(true);
  }
  expect(evaluateProjectFilters(project, { bhk: ["2"] })).toBe(false);
  expect(evaluateProjectFilters(project, { query: "3bhk in guntur", bhk: ["3"] })).toBe(false);
  expect(evaluateProjectFilters({ ...project, configurations: [{ label: "4 BHK - 3200 sq.ft", priceMin: 1, priceMax: 1 }] } as Project, { bhk: ["4+"] })).toBe(true);
  expect(evaluateProjectFilters({ ...project, projectType: "venture" }, { bhk: ["3"] })).toBe(false);
});


test.describe("Search accuracy regressions", () => {
  const project = { name: "Serene Grande", projectType: "apartment", location: { city: "Edupugallu", locality: "Serene Grande By Avenue Realty" }, configurations: [{ label: "2 BHK", priceMin: 6000000, priceMax: 7000000, builtUpAreaMin: 1000 }, { label: "3 BHK", priceMin: 11400000, priceMax: 13000000, builtUpAreaMin: 2400 }] } as Project;
  test("decimal and range budgets do not become stray name keywords", () => {
    expect(matchesProjectSearch(project, "3bhk in edupugallu under 1.5 cr")).toBe(true);
    expect(matchesProjectSearch(project, "3 BHK within ₹1.5cr in edupugalu")).toBe(true);
    expect(matchesProjectSearch(project, "3 BHK between 1 and 1.5 crore")).toBe(true);
    expect(matchesProjectSearch(project, "3 BHK under 90 lakhs")).toBe(false);
    expect(parseSearchIntent("between 50 lakh and 1 cr")).toMatchObject({ minPrice: 5000000, maxPrice: 10000000, specificKeywords: [] });
  });
  test("a single configuration must meet bedrooms budget and area together", () => {
    expect(evaluateProjectFilters(project, { bhk: ["3"], budget: [0, 9000000] })).toBe(false);
    expect(evaluateProjectFilters(project, { bhk: ["3"], coveredArea: [0, 1500] })).toBe(false);
    expect(evaluateProjectFilters(project, { bhk: ["3"], budget: [10000000, 15000000], coveredArea: [2000, 3000] })).toBe(true);
    expect(matchingProjectConfigurations(project, { bhk: ["3"] }).map(c => c.priceMin)).toEqual([11400000]);
  });
  test("unknown prices and areas cannot satisfy explicit constraints", () => {
    const unknown = { ...project, configurations: [{ label: "3 BHK" }] } as Project;
    expect(evaluateProjectFilters(unknown, { budget: [0, 9000000] })).toBe(false);
    expect(evaluateProjectFilters(unknown, { coveredArea: [1000, 3000] })).toBe(false);
    expect(evaluateProjectFilters(unknown, {})).toBe(true);
  });
  test("multiword locations use structured aliases without requiring their words in marketing text", () => {
    expect(matchesProjectSearch({ ...project, location: { city: "Vijayawada", locality: "Patamata" } } as Project, "3 bhk in benz circle")).toBe(true);
    expect(matchesProjectSearch(project, "3bhk in guntur")).toBe(false);
  });
  test("property minimum budgets are enforced", () => {
    const property = { title: "Home", price: 5000000, propertyType: "apartment", bedrooms: 3, location: {}, amenities: [], features: [] } as unknown as Property;
    expect(matchesPropertySearch(property, "above 80 lakh")).toBe(false);
    expect(matchesPropertySearch(property, "between 40 and 60 lakh")).toBe(true);
  });
  test("exact names outrank incidental description matches", () => {
    const intent = parseSearchIntent("Serene Grande");
    expect(searchRelevanceScore(project, intent)).toBeGreaterThan(searchRelevanceScore({ ...project, name: "Other Towers", description: "Near Serene Grande" }, intent));
    expect(matchesProjectSearch({ ...project, refId: "REF0001" }, "ref")).toBe(true);
    expect(matchesProjectSearch({ ...project, refId: "REF0001" }, "REF0001")).toBe(true);
  });
});

test.describe("10/10 Search Intelligence Enhancements", () => {
  test("Levenshtein and fuzzy match accurately compute typo tolerance", () => {
    expect(levenshteinDistance("mangalagiri", "mangalagirii")).toBe(1);
    expect(levenshteinDistance("vijayawada", "vijaywada")).toBe(1);
    expect(levenshteinDistance("apartment", "appartment")).toBe(1);
    expect(isFuzzyMatch("mangalagirii", "mangalagiri")).toBe(true);
    expect(isFuzzyMatch("vijaywada", "vijayawada")).toBe(true);
    expect(isFuzzyMatch("guntor", "guntur")).toBe(true);
    expect(isFuzzyMatch("appartment", "apartment")).toBe(true);
    expect(isFuzzyMatch("villla", "villa")).toBe(true);
    expect(isFuzzyMatch("rent", "bent")).toBe(false); // short words require exact match
  });

  test("fuzzy typo tolerance resolves AP localities and property types seamlessly", () => {
    const intent = parseSearchIntent("3bhk appartment in mangalagirii under 80 lakhs");
    expect(intent.bhks).toContain(3);
    expect(intent.propertyTypes).toContain("apartment");
    expect(intent.locationKeywords).toContain("mangalagiri");
    expect(intent.specificKeywords).not.toContain("mangalagirii");

    const mangalagiriProject = {
      id: "proj-mgl",
      name: "Mangalagiri Heights",
      projectType: "apartment",
      location: { city: "Guntur", locality: "Mangalagiri" },
      configurations: [{ label: "3 BHK", priceMin: 7000000, priceMax: 7800000 }],
    } as unknown as Project;

    expect(matchesProjectSearch(mangalagiriProject, "3bhk appartment in mangalagirii under 80 lakhs", intent)).toBe(true);
  });

  test("AP landmark spatial proximity resolves coordinates and filters geographically", () => {
    const aiimsIntent = parseSearchIntent("2 BHK flats near AIIMS under 60 lakhs");
    expect(aiimsIntent.landmark).toBeDefined();
    expect(aiimsIntent.landmark?.name).toBe("AIIMS Mangalagiri");
    expect(aiimsIntent.landmark?.latitude).toBeCloseTo(16.4402, 3);
    expect(aiimsIntent.landmark?.longitude).toBeCloseTo(80.5756, 3);

    // Project near AIIMS (~1.5 km away)
    const closeProject = {
      id: "proj-close",
      name: "Capital AIIMS Enclave",
      projectType: "apartment",
      location: {
        city: "Guntur",
        locality: "Mangalagiri",
        latitude: 16.4450,
        longitude: 80.5800,
      },
      configurations: [{ label: "2 BHK", priceMin: 4500000, priceMax: 5500000 }],
    } as unknown as Project;

    // Distant project in Visakhapatnam (~340 km away)
    const distantProject = {
      id: "proj-distant",
      name: "Coastal Breeze",
      projectType: "apartment",
      location: {
        city: "Visakhapatnam",
        locality: "Madhurawada",
        latitude: 17.8200,
        longitude: 83.3500,
      },
      configurations: [{ label: "2 BHK", priceMin: 4500000, priceMax: 5500000 }],
    } as unknown as Project;

    expect(matchesProjectSearch(closeProject, "2 BHK flats near AIIMS under 60 lakhs", aiimsIntent)).toBe(true);
    expect(matchesProjectSearch(distantProject, "2 BHK flats near AIIMS under 60 lakhs", aiimsIntent)).toBe(false);

    // Geodesic distance calculation verification
    const distanceKm = haversineDistanceKm(16.4402, 80.5756, 16.4450, 80.5800);
    expect(distanceKm).toBeLessThan(2);

    // Proximity relevance boost
    const closeScore = searchRelevanceScore(closeProject, aiimsIntent);
    expect(closeScore).toBeGreaterThanOrEqual(180);
  });

  test("quality & verified trust signals boost search relevance score", () => {
    const baseIntent = parseSearchIntent("Apartments in Vijayawada");

    const standardProject = {
      id: "std-1",
      name: "Sunrise Apartments",
      projectType: "apartment",
      location: { city: "Vijayawada", locality: "Kanuru" },
      configurations: [{ label: "3 BHK", priceMin: 6500000, priceMax: 7500000 }],
    } as unknown as Project;

    const reraVerifiedProject = {
      id: "rera-1",
      name: "Sunrise Apartments",
      projectType: "apartment",
      reraApproved: true,
      reraId: "P02240010001",
      isRoadExclusive: true,
      videoUrl: "https://youtube.com/watch?v=demo",
      location: { city: "Vijayawada", locality: "Kanuru" },
      configurations: [{ label: "3 BHK", priceMin: 6500000, priceMax: 7500000 }],
    } as unknown as Project;

    const standardScore = searchRelevanceScore(standardProject, baseIntent);
    const verifiedScore = searchRelevanceScore(reraVerifiedProject, baseIntent);

    expect(verifiedScore).toBeGreaterThan(standardScore);
    // Verified project receives RERA (+40) + Road Exclusive (+35) + Video (+25) = +100 bonus
    expect(verifiedScore - standardScore).toBeGreaterThanOrEqual(100);
  });

  test("Telugu regional land units and vastu facing are extracted accurately", () => {
    const facingIntent = parseSearchIntent("East facing 3 BHK apartment in Vijayawada");
    expect(facingIntent.bhks).toContain(3);
    expect(facingIntent.facings).toContain("east");
    expect(facingIntent.specificKeywords).not.toContain("east");

    const gajaluIntent = parseSearchIntent("200 gajalu plot in Amaravati");
    expect(gajaluIntent.propertyTypes).toContain("residential-land");
    expect(gajaluIntent.maxAreaSqYds).toBe(200);

    const centsIntent = parseSearchIntent("5 cents land in Mangalagiri");
    expect(centsIntent.propertyTypes).toContain("residential-land");
    expect(centsIntent.maxAreaSqYds).toBeCloseTo(5 * 48.4, 1);
  });
});
