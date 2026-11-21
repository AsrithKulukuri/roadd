import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const FORBIDDEN_WORDS = [
  "leaflet",
  "openstreetmap",
  "tile.openstreetmap",
  "nominatim",
  "photon.komoot",
  "komoot",
  "mapbox",
  "maplibre",
  "openlayers",
];

function scanDirectory(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== ".git") {
        scanDirectory(fullPath, fileList);
      }
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe("Forbidden Map and Geocoding Providers Guard", () => {
  it("verifies package.json does not contain any forbidden packages", () => {
    const pkgJsonPath = path.resolve(process.cwd(), "package.json");
    const content = fs.readFileSync(pkgJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    const forbiddenPackages = [
      "leaflet",
      "react-leaflet",
      "leaflet-defaulticon-compatibility",
      "leaflet.gridlayer.googlemutant",
      "@types/leaflet",
      "mapbox-gl",
      "maplibre-gl",
      "ol",
    ];

    for (const forbidden of forbiddenPackages) {
      assert.equal(
        forbidden in allDeps,
        false,
        `Forbidden package "${forbidden}" was found in package.json!`
      );
    }
  });

  it("verifies src/ contains zero forbidden provider references", () => {
    const srcDir = path.resolve(process.cwd(), "src");
    const allFiles = scanDirectory(srcDir);
    const violations: Array<{ file: string; match: string; line: number }> = [];

    for (const filePath of allFiles) {
      const text = fs.readFileSync(filePath, "utf-8");
      const lines = text.split("\n");

      lines.forEach((lineText, lineIdx) => {
        const lower = lineText.toLowerCase();
        for (const word of FORBIDDEN_WORDS) {
          // Check for word boundary or domain substring
          const regex = new RegExp(`\\b${word.replace(".", "\\.")}\\b`, "i");
          if (regex.test(lower)) {
            violations.push({
              file: path.relative(process.cwd(), filePath),
              match: word,
              line: lineIdx + 1,
            });
          }
        }
      });
    }

    assert.equal(
      violations.length,
      0,
      `Found forbidden map providers in src/:\n${violations
        .map((v) => `  - ${v.file}:${v.line} matches "${v.match}"`)
        .join("\n")}`
    );
  });
});

