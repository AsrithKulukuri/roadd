import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchSublocation } from "../../src/lib/maps/sublocation-matcher";
import type { SublocationRecord, SublocationAliasRecord } from "../../src/lib/data/sublocations";

const mockMasterList: SublocationRecord[] = [
  {
    id: "sub-benz",
    city_id: "vijayawada",
    name: "Benz Circle",
    slug: "benz-circle",
    lat: 16.5062,
    lng: 80.6480,
    status: "active",
  },
  {
    id: "sub-poranki",
    city_id: "vijayawada",
    name: "Poranki",
    slug: "poranki",
    lat: 16.4780,
    lng: 80.6950,
    status: "active",
  },
  {
    id: "sub-kanuru",
    city_id: "vijayawada",
    name: "Kanuru",
    slug: "kanuru",
    lat: 16.5350,
    lng: 80.6820,
    status: "active",
  },
  {
    id: "sub-edupugallu",
    city_id: "vijayawada",
    name: "Edupugallu",
    slug: "edupugallu",
    lat: 16.4641,
    lng: 80.7549,
    status: "active",
  },
];

const mockAliasList: SublocationAliasRecord[] = [
  {
    id: "alias-1",
    city_id: "vijayawada",
    sublocation_id: "sub-edupugallu",
    alias: "Yedupugallu",
    alias_normalized: "yedupugallu",
    source: "admin",
  },
];

describe("Sublocation Matcher", () => {
  it("auto-selects on exact master name match (confidence >= 0.95)", () => {
    const res = matchSublocation({
      detectedName: "Benz Circle",
      cityId: "vijayawada",
      masterList: mockMasterList,
      aliasList: mockAliasList,
    });

    assert.equal(res.status, "matched");
    assert.ok(res.match);
    assert.equal(res.match.id, "sub-benz");
    assert.equal(res.match.name, "Benz Circle");
    assert.ok(res.match.confidence >= 0.95);
  });

  it("auto-selects on exact alias match (confidence >= 0.95)", () => {
    const res = matchSublocation({
      detectedName: "Yedupugallu",
      cityId: "vijayawada",
      masterList: mockMasterList,
      aliasList: mockAliasList,
    });

    assert.equal(res.status, "matched");
    assert.ok(res.match);
    assert.equal(res.match.id, "sub-edupugallu");
    assert.equal(res.match.name, "Edupugallu");
    assert.ok(res.match.confidence >= 0.95);
  });

  it("matches on strong fuzzy name variation (confidence >= 0.90)", () => {
    const res = matchSublocation({
      detectedName: "Benz Circle Center",
      cityId: "vijayawada",
      masterList: mockMasterList,
      aliasList: mockAliasList,
    });

    assert.ok(res.candidates.length > 0);
    const topCandidate = res.candidates[0];
    assert.equal(topCandidate.name, "Benz Circle");
    assert.ok(topCandidate.confidence >= 0.90);
  });

  it("caps proximity match confidence at 0.85 and NEVER auto-selects", () => {
    // 300 meters from Benz Circle centroid
    const res = matchSublocation({
      detectedName: "Unknown Complex",
      pinLat: 16.5080,
      pinLng: 80.6490,
      cityId: "vijayawada",
      masterList: mockMasterList,
      aliasList: mockAliasList,
    });

    // Proximity match should be suggested, NEVER auto-matched!
    assert.notEqual(res.status, "matched", "Proximity match must NEVER auto-select");
    assert.equal(res.status, "suggested");
    assert.equal(res.match, null);

    const proxCandidate = res.candidates.find((c) => c.source === "proximity");
    assert.ok(proxCandidate, "Should have a proximity candidate");
    assert.equal(proxCandidate.name, "Benz Circle");
    assert.ok(
      proxCandidate.confidence <= 0.85,
      `Proximity confidence must be capped at 0.85 (got ${proxCandidate.confidence})`
    );
  });

  it("returns status 'new' when no candidate matches", () => {
    // Far away with an unknown name
    const res = matchSublocation({
      detectedName: "Faraway New Suburb",
      pinLat: 17.5000,
      pinLng: 81.5000,
      cityId: "vijayawada",
      masterList: mockMasterList,
      aliasList: mockAliasList,
    });

    assert.equal(res.status, "new");
    assert.equal(res.match, null);
    assert.equal(res.candidates.length, 0);
    assert.equal(res.detectedName, "Faraway New Suburb");
  });

  it("strictly rejects city name 'Vijayawada' as sublocation (must be empty/none, never 'Vijayawada')", () => {
    // Fixture where the only locality-like value returned is "Vijayawada"
    const res = matchSublocation({
      detectedName: "Vijayawada",
      cityId: "vijayawada",
      masterList: mockMasterList,
      aliasList: mockAliasList,
    });

    // Sublocation must be empty / none, not "Vijayawada"
    assert.notEqual(res.detectedName, "Vijayawada", "detectedName must NEVER be the city name");
    assert.equal(res.detectedName, "");
    assert.equal(res.match, null, "match must be null");
    assert.equal(res.status, "none", "status must be 'none'");
    assert.equal(res.candidates.length, 0);
  });
});

