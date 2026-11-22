import { describe, it } from "node:test";
import assert from "node:assert";
import {
  haversineDistanceKm,
  formatStraightLineDistance,
  formatDrivingDistance,
  computeDrivingDistance,
  drivingDistanceCache,
  drivingDistanceRateLimiter,
} from "../../src/lib/maps/driving-distance-service";

describe("Driving Distance & Straight-Line Service", () => {
  it("calculates accurate haversine straight-line distance in km", () => {
    // Hyderabad (17.3850, 78.4867) to Vijayawada (16.5062, 80.6480) ~ 248 km straight line
    const dist = haversineDistanceKm(17.3850, 78.4867, 16.5062, 80.6480);
    assert.ok(dist > 240 && dist < 260, `Expected ~248 km, got ${dist}`);
  });

  it("labels straight-line values with '(straight line)' across formatting thresholds", () => {
    const under1km = formatStraightLineDistance(0.45);
    assert.strictEqual(under1km, "450 m away (straight line)");

    const under10km = formatStraightLineDistance(5.34);
    assert.strictEqual(under10km, "5.3 km away (straight line)");

    const longDistance = formatStraightLineDistance(315.2);
    assert.strictEqual(longDistance, "315 km away (straight line)");
  });

  it("formats driving road distance exactly as specified: e.g. 375 kms from me", () => {
    // 375.2 km
    const formattedLong = formatDrivingDistance(375200);
    assert.strictEqual(formattedLong, "375 kms from me");

    // Local trip: 12 km
    const formattedLocal = formatDrivingDistance(12000);
    assert.strictEqual(formattedLocal, "12 kms from me");

    // Short trip under 10 km: 4.5 km
    const formattedShort = formatDrivingDistance(4500);
    assert.strictEqual(formattedShort, "4.5 kms from me");
  });

  it("falls back to road driving engine when Google API key or route fails", async () => {
    const result = await computeDrivingDistance({
      originLat: 17.3850,
      originLng: 78.4867,
      destLat: 16.5062,
      destLng: 80.6480,
      destinationId: "test-dest-fallback",
      ip: "127.0.0.1",
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.display.includes("from me"), `Expected 'from me', got ${result.display}`);
    assert.strictEqual(result.isDrivingDistance, true);
    assert.ok(result.distanceKm > 200, `Expected distance > 200, got ${result.distanceKm}`);
  });

  it("caches query by rounded origin (3 decimals) + destination id for 24h", async () => {
    const originLat = 17.385123;
    const originLng = 78.486789;
    const destId = "dwaraka-heights-test";
    const cacheKey = `driving_dist:${originLat.toFixed(3)},${originLng.toFixed(3)}:${destId}`;

    // Seed cache
    await drivingDistanceCache.set(cacheKey, {
      success: true,
      isDrivingDistance: true,
      distanceKm: 375,
      formattedDistance: "375 km",
      durationSeconds: 24660,
      formattedDuration: "6 hr 51 min",
      display: "375 kms from me",
      source: "google_routes",
    }, 86400);

    // Call service with slightly jittered coordinates that round to the same 3 decimals
    const result = await computeDrivingDistance({
      originLat: 17.385444, // rounds to 17.385
      originLng: 78.486888, // rounds to 78.487
      destLat: 16.5062,
      destLng: 80.6480,
      destinationId: destId,
      ip: "127.0.0.2",
    });

    assert.strictEqual(result.source, "cache");
    assert.strictEqual(result.display, "375 kms from me");
    assert.strictEqual(result.isDrivingDistance, true);
  });

  it("enforces per-IP rate limiting and falls back to road routing engine when exceeded", async () => {
    const testIp = "192.168.1.99";
    // Exhaust rate limit
    for (let i = 0; i < 60; i++) {
      await drivingDistanceRateLimiter.check(testIp, 60, 60);
    }

    const check = await drivingDistanceRateLimiter.check(testIp, 60, 60);
    assert.strictEqual(check.allowed, false, "Expected rate limit to block request #61");

    // computeDrivingDistance with this IP should return road routing engine result
    const result = await computeDrivingDistance({
      originLat: 16.5000,
      originLng: 80.6400,
      destLat: 16.5100,
      destLng: 80.6500,
      destinationId: "test-dest-rate-limited",
      ip: testIp,
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.display.includes("from me"));
  });
});
