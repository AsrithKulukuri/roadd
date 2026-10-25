import { chromium, type Page } from "@playwright/test";

export interface PageAuditResult {
  url: string;
  status: number;
  cacheHeader: string | null;
  ttfbMs: number;
  downloadMs: number;
  totalNavMs: number;
  fcpMs: number | null;
  lcpMs: number | null;
  cls: number;
  jsBytes: number;
  jsCount: number;
  cssBytes: number;
  cssCount: number;
  imgBytes: number;
  imgCount: number;
  fontBytes: number;
  fontCount: number;
  apiBytes: number;
  apiCount: number;
  totalTransferredBytes: number;
  totalResourceCount: number;
}

const ROUTES = [
  { name: "Homepage", path: "/" },
  { name: "Property Listings", path: "/properties" },
  { name: "Property Detail", path: "/properties/1bhk-flat-benz-circle-vijayawada-1" },
  { name: "Search & Filters", path: "/search" },
  { name: "Projects Directory", path: "/projects" },
  { name: "Login", path: "/login" },
  { name: "Register", path: "/register" },
  { name: "Admin Login", path: "/admin/login" },
  { name: "Builder Login", path: "/builder/login" },
  { name: "Contact Us", path: "/contact" },
];

async function auditRoute(page: Page, baseUrl: string, path: string): Promise<PageAuditResult> {
  const fullUrl = `${baseUrl}${path}`;

  // Reset performance state in window
  await page.addInitScript(() => {
    (window as any).__perfData = {
      lcp: null,
      cls: 0,
    };

    try {
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          (window as any).__perfData.lcp = lastEntry.startTime;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}

    try {
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            (window as any).__perfData.cls += (entry as any).value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
  });

  const response = await page.goto(fullUrl, { waitUntil: "networkidle", timeout: 20000 });
  const status = response ? response.status() : 0;
  const headers = response ? await response.allHeaders() : {};
  const cacheHeader = headers["x-nextjs-cache"] || headers["cache-control"] || null;

  // Wait a moment for any final paint / observers
  await page.waitForTimeout(500);

  const perfMetrics = await page.evaluate(() => {
    const navEntries = performance.getEntriesByType("navigation");
    const nav = (navEntries[0] as PerformanceNavigationTiming) || null;

    const paintEntries = performance.getEntriesByType("paint");
    const fcpEntry = paintEntries.find((e) => e.name === "first-contentful-paint");
    const fcp = fcpEntry ? fcpEntry.startTime : null;

    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

    let jsBytes = 0;
    let jsCount = 0;
    let cssBytes = 0;
    let cssCount = 0;
    let imgBytes = 0;
    let imgCount = 0;
    let fontBytes = 0;
    let fontCount = 0;
    let apiBytes = 0;
    let apiCount = 0;
    let totalTransferred = 0;

    for (const res of resources) {
      const size = res.transferSize || res.encodedBodySize || 0;
      totalTransferred += size;
      const name = res.name.toLowerCase();
      const initiator = res.initiatorType;

      if (initiator === "script" || name.endsWith(".js") || name.includes("/_next/static/chunks/")) {
        jsBytes += size;
        jsCount++;
      } else if (initiator === "css" || name.endsWith(".css")) {
        cssBytes += size;
        cssCount++;
      } else if (initiator === "img" || /\.(png|jpg|jpeg|webp|avif|svg|gif)($|\?)/.test(name)) {
        imgBytes += size;
        imgCount++;
      } else if (initiator === "font" || /\.(woff2?|ttf|otf)($|\?)/.test(name)) {
        fontBytes += size;
        fontCount++;
      } else if (initiator === "fetch" || initiator === "xmlhttprequest" || name.includes("/api/")) {
        apiBytes += size;
        apiCount++;
      }
    }

    const ttfb = nav ? nav.responseStart - nav.requestStart : 0;
    const download = nav ? nav.responseEnd - nav.responseStart : 0;
    const totalNav = nav ? nav.loadEventEnd - nav.startTime : 0;

    const perfData = (window as any).__perfData || {};

    return {
      ttfb: Math.round(ttfb),
      download: Math.round(download),
      totalNav: Math.round(totalNav),
      fcp: fcp !== null ? Math.round(fcp) : null,
      lcp: perfData.lcp !== null ? Math.round(perfData.lcp) : null,
      cls: Number(Number(perfData.cls || 0).toFixed(4)),
      jsBytes,
      jsCount,
      cssBytes,
      cssCount,
      imgBytes,
      imgCount,
      fontBytes,
      fontCount,
      apiBytes,
      apiCount,
      totalTransferredBytes: totalTransferred,
      totalResourceCount: resources.length,
    };
  });

  return {
    url: path,
    status,
    cacheHeader,
    ttfbMs: perfMetrics.ttfb,
    downloadMs: perfMetrics.download,
    totalNavMs: perfMetrics.totalNav,
    fcpMs: perfMetrics.fcp,
    lcpMs: perfMetrics.lcp,
    cls: perfMetrics.cls,
    jsBytes: perfMetrics.jsBytes,
    jsCount: perfMetrics.jsCount,
    cssBytes: perfMetrics.cssBytes,
    cssCount: perfMetrics.cssCount,
    imgBytes: perfMetrics.imgBytes,
    imgCount: perfMetrics.imgCount,
    fontBytes: perfMetrics.fontBytes,
    fontCount: perfMetrics.fontCount,
    apiBytes: perfMetrics.apiBytes,
    apiCount: perfMetrics.apiCount,
    totalTransferredBytes: perfMetrics.totalTransferredBytes,
    totalResourceCount: perfMetrics.totalResourceCount,
  };
}

async function main() {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  console.log(`================================================================================`);
  console.log(`🌐 ROAD PAGE-BY-PAGE PERFORMANCE AUDIT`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Browser: Chromium (Headless)`);
  console.log(`================================================================================\n`);

  const browser = await chromium.launch({ headless: true });
  const results: Record<string, PageAuditResult> = {};

  for (const r of ROUTES) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    try {
      // Warm up / cold run: do 1 initial request to get true cold vs warm
      const result = await auditRoute(page, baseUrl, r.path);
      results[r.name] = result;
      console.log(`📍 [${r.name}] -> Status: ${result.status} | TTFB: ${result.ttfbMs}ms | FCP: ${result.fcpMs}ms | LCP: ${result.lcpMs}ms | CLS: ${result.cls} | Transferred: ${(result.totalTransferredBytes / 1024).toFixed(1)} KB (${result.totalResourceCount} reqs)`);
    } catch (err: any) {
      console.error(`❌ [${r.name}] Failed:`, err?.message);
    } finally {
      await context.close();
    }
  }

  await browser.close();

  console.log("\n================================================================================");
  console.log("📊 SUMMARY TABLE (MEASURED BROWSING METRICS)");
  console.log("================================================================================");
  console.table(
    Object.entries(results).map(([name, data]) => ({
      Page: name,
      Status: data.status,
      "TTFB (ms)": data.ttfbMs,
      "FCP (ms)": data.fcpMs ?? "N/A",
      "LCP (ms)": data.lcpMs ?? "N/A",
      CLS: data.cls,
      "JS (KB)": Math.round(data.jsBytes / 1024),
      "CSS (KB)": Math.round(data.cssBytes / 1024),
      "Img (KB)": Math.round(data.imgBytes / 1024),
      "Total (KB)": Math.round(data.totalTransferredBytes / 1024),
      Requests: data.totalResourceCount,
    }))
  );

  // Write results to JSON artifact
  import("fs").then((fs) => {
    fs.writeFileSync("scripts/page-audit-results.json", JSON.stringify(results, null, 2));
    console.log("Audit data saved to scripts/page-audit-results.json");
  });
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
