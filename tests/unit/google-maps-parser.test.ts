import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseGoogleMapsUrlSync,
  isSafeMapsUrl,
} from "../../src/lib/maps/google-maps-parser";

describe("Google Maps URL Parser", () => {
  it("prefers !3d!4d pin coordinates over @ viewport coordinates", () => {
    // Real Google Maps desktop URL containing both viewport @16.5100,80.6500 and pin !3d16.5062!4d80.6480
    const url =
      "https://www.google.com/maps/place/Benz+Circle/@16.510000,80.650000,16z/data=!4m6!3m5!1s0x3a35e4d2c:0x12345!8m2!3d16.506200!4d80.648000!16s%2Fg%2F11b6";

    const parsed = parseGoogleMapsUrlSync(url);
    assert.ok(parsed, "Parser should return a result");
    assert.equal(parsed.precision, "pin");
    assert.equal(parsed.lat, 16.5062);
    assert.equal(parsed.lng, 80.648);
  });

  it("parses ?q=lat,lng as exact pin", () => {
    const url = "https://maps.google.com/?q=16.4890,80.6601";
    const parsed = parseGoogleMapsUrlSync(url);
    assert.ok(parsed);
    assert.equal(parsed.precision, "pin");
    assert.equal(parsed.lat, 16.489);
    assert.equal(parsed.lng, 80.6601);
  });

  it("parses ?ll=lat,lng as exact pin", () => {
    const url = "https://www.google.com/maps?ll=16.4780,80.6950&z=15";
    const parsed = parseGoogleMapsUrlSync(url);
    assert.ok(parsed);
    assert.equal(parsed.precision, "pin");
    assert.equal(parsed.lat, 16.478);
    assert.equal(parsed.lng, 80.695);
  });

  it("parses raw comma-separated coordinates as exact pin", () => {
    const parsed = parseGoogleMapsUrlSync("16.5350, 80.6820");
    assert.ok(parsed);
    assert.equal(parsed.precision, "pin");
    assert.equal(parsed.lat, 16.535);
    assert.equal(parsed.lng, 80.682);
  });

  it("parses place_id query parameter", () => {
    const url = "https://www.google.com/maps/search/?api=1&query=Auto+Nagar&query_place_id=ChIJ123456789";
    const parsed = parseGoogleMapsUrlSync(url);
    assert.ok(parsed);
    assert.equal(parsed.precision, "pin");
    assert.equal(parsed.placeId, "ChIJ123456789");
  });

  it("falls back to @lat,lng as viewport with precision warning when no pin exists", () => {
    const url = "https://www.google.com/maps/@16.4630,80.7120,15z";
    const parsed = parseGoogleMapsUrlSync(url);
    assert.ok(parsed);
    assert.equal(parsed.precision, "viewport");
    assert.equal(parsed.lat, 16.463);
    assert.equal(parsed.lng, 80.712);
  });

  it("extracts place query from /maps/place/{NAME}/", () => {
    const url = "https://www.google.com/maps/place/Tadepalli,+Andhra+Pradesh/";
    const parsed = parseGoogleMapsUrlSync(url);
    assert.ok(parsed);
    assert.equal(parsed.precision, "place_query");
    assert.equal(parsed.placeQuery, "Tadepalli, Andhra Pradesh");
  });

  it("blocks SSRF attacks with private IPs, loopback, or cloud metadata", () => {
    assert.equal(isSafeMapsUrl("http://google.com/maps"), false, "Must block http");
    assert.equal(isSafeMapsUrl("https://127.0.0.1/maps"), false, "Must block loopback");
    assert.equal(isSafeMapsUrl("https://localhost:3000/maps"), false, "Must block localhost");
    assert.equal(isSafeMapsUrl("https://169.254.169.254/latest/meta-data"), false, "Must block cloud metadata");
    assert.equal(isSafeMapsUrl("https://192.168.1.1/maps"), false, "Must block private network");
    assert.equal(isSafeMapsUrl("https://evil-site.com/google.com"), false, "Must block foreign domains");
    assert.equal(isSafeMapsUrl("https://maps.google.com/maps"), true, "Must allow maps.google.com");
    assert.equal(isSafeMapsUrl("https://maps.app.goo.gl/xyz123"), true, "Must allow maps.app.goo.gl");
  });
});

