import { test, expect } from "@playwright/test";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/media/[...path]/route";
import * as s3Module from "@/lib/aws/s3";

test.describe("ROAD Next.js Media Proxy Unit Tests", () => {
  const originalGetClient = s3Module.getClient;
  const originalGetBucketName = s3Module.getBucketName;

  test.beforeAll(() => {
    // Stub bucket name
    (s3Module as any).getBucketName = () => "test-roadfacing-bucket";
  });

  test.afterAll(() => {
    (s3Module as any).getClient = originalGetClient;
    (s3Module as any).getBucketName = originalGetBucketName;
  });

  function makeRequest(path: string, headers: Record<string, string> = {}) {
    return new NextRequest(`http://localhost:3000/api/media/${path}`, {
      method: "GET",
      headers,
    });
  }

  test.describe("Prefix and Path Security Validation", () => {
    test("rejects empty path array", async () => {
      const req = makeRequest("");
      const res = await GET(req, { params: Promise.resolve({ path: [] }) });
      expect(res.status).toBe(404);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });

    test("rejects disallowed prefixes (e.g. private/, builder-evidence/, secret/)", async () => {
      const disallowed = [
        "builder-evidence/doc.pdf",
        "secret/passwords.txt",
        "admin/data.json",
        "users/private.jpg",
      ];

      for (const item of disallowed) {
        const segments = item.split("/");
        const req = makeRequest(item);
        const res = await GET(req, { params: Promise.resolve({ path: segments }) });
        expect(res.status).toBe(404);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
      }
    });

    test("rejects path traversal attempts (.., %2e%2e, null bytes, backslashes)", async () => {
      const traversalAttempts = [
        ["properties", "..", "secret.jpg"],
        ["banners", "../secret.jpg"],
        ["categories", "sub\\folder.jpg"],
        ["projects", "file\0.jpg"],
        ["avatars", "%2e%2e", "file.jpg"],
        ["properties", "sub", "%2f", "file.jpg"],
        ["videos", "test%5cfile.mp4"],
      ];

      for (const segments of traversalAttempts) {
        const req = makeRequest(segments.join("/"));
        const res = await GET(req, { params: Promise.resolve({ path: segments }) });
        expect(res.status).toBe(404);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
      }
    });

    test("rejects unsupported file extensions before fetching S3", async () => {
      const unsupported = [
        ["properties", "script.exe"],
        ["banners", "index.html"],
        ["projects", "style.css"],
        ["categories", "vector.svg"],
        ["avatars", "config.json"],
        ["brochures", "page.php"],
      ];

      for (const segments of unsupported) {
        const req = makeRequest(segments.join("/"));
        const res = await GET(req, { params: Promise.resolve({ path: segments }) });
        expect(res.status).toBe(404);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
      }
    });
  });

  test.describe("Content-Type & S3 Retrieval Behavior", () => {
    test("serves static images with 1-year immutable caching on full 200 response", async () => {
      const fakeImageBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      (s3Module as any).getClient = () => ({
        send: async () => ({
          ContentType: "image/jpeg",
          ContentLength: fakeImageBytes.length,
          ETag: '"test-etag-123"',
          Body: {
            transformToByteArray: async () => fakeImageBytes,
          },
        }),
      });

      const req = makeRequest("properties/sample.jpg");
      const res = await GET(req, { params: Promise.resolve({ path: ["properties", "sample.jpg"] }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/jpeg");
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
      expect(res.headers.get("ETag")).toBe('"test-etag-123"');
      expect(res.headers.get("Content-Length")).toBe(String(fakeImageBytes.length));
    });

    test("serves PDF brochures with 1-day caching and inline disposition", async () => {
      const fakePdfBytes = Buffer.from("%PDF-1.4 test");
      (s3Module as any).getClient = () => ({
        send: async () => ({
          ContentType: "application/pdf",
          ContentLength: fakePdfBytes.length,
          ETag: '"pdf-etag-456"',
          Body: {
            transformToByteArray: async () => fakePdfBytes,
            transformToWebStream: () => "mock-stream",
          },
        }),
      });

      const req = makeRequest("brochures/project-brochure.pdf");
      const res = await GET(req, { params: Promise.resolve({ path: ["brochures", "project-brochure.pdf"] }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
      expect(res.headers.get("Content-Disposition")).toContain("inline");
    });

    test("normalizes missing or octet-stream S3 Content-Type to correct mime type", async () => {
      const fakeWebpBytes = Buffer.from("RIFF....WEBP");
      (s3Module as any).getClient = () => ({
        send: async () => ({
          ContentType: "application/octet-stream", // S3 generic fallback
          ContentLength: fakeWebpBytes.length,
          Body: {
            transformToByteArray: async () => fakeWebpBytes,
          },
        }),
      });

      const req = makeRequest("banners/hero.webp");
      const res = await GET(req, { params: Promise.resolve({ path: ["banners", "hero.webp"] }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/webp");
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    });
  });

  test.describe("Range Request & Partial Content Handling", () => {
    test("returns 206 Partial Content when S3 honors Range header with ContentRange", async () => {
      const fakeChunk = Buffer.from("chunk-bytes-0-100");
      (s3Module as any).getClient = () => ({
        send: async () => ({
          ContentType: "video/mp4",
          ContentLength: fakeChunk.length,
          ContentRange: "bytes 0-100/1000",
          ETag: '"video-etag-789"',
          Body: {
            transformToByteArray: async () => fakeChunk,
          },
        }),
      });

      const req = makeRequest("videos/walkthrough.mp4", { Range: "bytes=0-100" });
      const res = await GET(req, { params: Promise.resolve({ path: ["videos", "walkthrough.mp4"] }) });

      expect(res.status).toBe(206);
      expect(res.headers.get("Content-Range")).toBe("bytes 0-100/1000");
      expect(res.headers.get("Content-Type")).toBe("video/mp4");
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
    });

    test("returns 200 Full Content when S3 does not return ContentRange for a requested range", async () => {
      const fullBytes = Buffer.from("full-video-bytes");
      (s3Module as any).getClient = () => ({
        send: async () => ({
          ContentType: "video/mp4",
          ContentLength: fullBytes.length,
          // ContentRange omitted by S3
          Body: {
            transformToByteArray: async () => fullBytes,
          },
        }),
      });

      const req = makeRequest("videos/walkthrough.mp4", { Range: "bytes=0-100" });
      const res = await GET(req, { params: Promise.resolve({ path: ["videos", "walkthrough.mp4"] }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Range")).toBeNull();
      expect(res.headers.get("Content-Type")).toBe("video/mp4");
    });

    test("returns 416 Range Not Satisfiable when S3 throws InvalidRange", async () => {
      (s3Module as any).getClient = () => ({
        send: async () => {
          const err: any = new Error("The requested range is not satisfiable");
          err.name = "InvalidRange";
          err.$metadata = { httpStatusCode: 416 };
          throw err;
        },
      });

      const req = makeRequest("videos/walkthrough.mp4", { Range: "bytes=999999-1000000" });
      const res = await GET(req, { params: Promise.resolve({ path: ["videos", "walkthrough.mp4"] }) });

      expect(res.status).toBe(416);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      expect(res.headers.get("Accept-Ranges")).toBe("bytes");
    });
  });

  test.describe("Error & Missing Object Responses", () => {
    test("serves fallback SVG placeholder with no-cache headers when image is missing in S3", async () => {
      (s3Module as any).getClient = () => ({
        send: async () => {
          const err: any = new Error("The specified key does not exist.");
          err.name = "NoSuchKey";
          throw err;
        },
      });

      const req = makeRequest("properties/missing-house.jpg");
      const res = await GET(req, { params: Promise.resolve({ path: ["properties", "missing-house.jpg"] }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
      expect(res.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate");
      const text = await res.text();
      expect(text).toContain("<svg");
      expect(text).toContain("ROADFACING Media");
    });

    test("returns 404 with no-store when video or document is missing in S3", async () => {
      (s3Module as any).getClient = () => ({
        send: async () => {
          const err: any = new Error("The specified key does not exist.");
          err.name = "NoSuchKey";
          throw err;
        },
      });

      const req = makeRequest("videos/missing-tour.mp4");
      const res = await GET(req, { params: Promise.resolve({ path: ["videos", "missing-tour.mp4"] }) });

      expect(res.status).toBe(404);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });

    test("returns fallback SVG with Cache-Control: no-store on unexpected outer exception", async () => {
      // Force an unexpected outer error by making params reject
      const req = makeRequest("properties/error.jpg");
      const res = await GET(req, {
        params: Promise.reject(new Error("Unexpected internal worker crash")),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });
  });
});
