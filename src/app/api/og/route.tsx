import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

function getTrustedImageUrl(value: string): string {
  if (!value) return "";

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const configuredSite = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
    const siteHostname = configuredSite ? new URL(configuredSite).hostname.toLowerCase() : "";
    const isTrustedHost =
      hostname === "images.unsplash.com" ||
      hostname === "plus.unsplash.com" ||
      hostname === "picsum.photos" ||
      hostname === "lh3.googleusercontent.com" ||
      hostname.endsWith(".supabase.co") ||
      hostname.endsWith(".amazonaws.com") ||
      (siteHostname !== "" && hostname === siteHostname);

    return url.protocol === "https:" && isTrustedHost ? url.href : "";
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get("title") || "Real Estate in Vijayawada, Guntur & Amaravati";
    const price = searchParams.get("price") || "";
    const location = searchParams.get("location") || "Andhra Pradesh (CRDA Region)";
    const type = searchParams.get("type") || "Property";
    const badge = searchParams.get("badge") || "RERA Verified";
    const specs = searchParams.get("specs") || "";
    const image = getTrustedImageUrl(searchParams.get("image") || "");

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#020617",
            backgroundImage: "radial-gradient(circle at 25px 25px, #1e293b 2%, transparent 0%), radial-gradient(circle at 75px 75px, #0f172a 2%, transparent 0%)",
            backgroundSize: "100px 100px",
            color: "#ffffff",
            padding: "48px 56px",
            position: "relative",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {/* Subtle Ambient Gold Mesh Glow */}
          <div
            style={{
              position: "absolute",
              top: "-80px",
              right: "-80px",
              width: "480px",
              height: "480px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0) 70%)",
              filter: "blur(60px)",
            }}
          />

          {/* Top Header Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              marginBottom: "32px",
            }}
          >
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#faad13",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#020617",
                  fontWeight: 900,
                  fontSize: "24px",
                }}
              >
                RF
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "26px",
                    fontWeight: 900,
                    letterSpacing: "-0.5px",
                    color: "#ffffff",
                  }}
                >
                  ROAD<span style={{ color: "#faad13" }}>FACING</span>
                </span>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>
                  Real Projects • Real Updates
                </span>
              </div>
            </div>

            {/* Verification Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "rgba(245, 158, 11, 0.12)",
                border: "1.5px solid rgba(245, 158, 11, 0.4)",
                padding: "8px 18px",
                borderRadius: "9999px",
                color: "#faad13",
                fontSize: "14px",
                fontWeight: 800,
                letterSpacing: "0.3px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                }}
              />
              {badge}
            </div>
          </div>

          {/* Main Card Content Grid */}
          <div
            style={{
              display: "flex",
              flex: 1,
              gap: "36px",
              alignItems: "center",
            }}
          >
            {/* Left Content Area */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                justifyContent: "center",
              }}
            >
              {/* Type Pill */}
              <div style={{ display: "flex", marginBottom: "12px" }}>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    color: "#38bdf8",
                    backgroundColor: "rgba(56, 189, 248, 0.12)",
                    padding: "4px 12px",
                    borderRadius: "6px",
                  }}
                >
                  {type}
                </span>
              </div>

              {/* Title */}
              <h1
                style={{
                  fontSize: "36px",
                  fontWeight: 900,
                  color: "#ffffff",
                  lineHeight: 1.2,
                  marginBottom: "16px",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {title}
              </h1>

              {/* Location */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "#cbd5e1",
                  marginBottom: "20px",
                }}
              >
                <span style={{ color: "#faad13" }}>📍</span>
                <span>{location}</span>
              </div>

              {/* Specs Pills (if present) */}
              {specs ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "24px",
                    fontSize: "15px",
                    color: "#94a3b8",
                    fontWeight: 700,
                  }}
                >
                  {specs}
                </div>
              ) : null}

              {/* Price Tag */}
              {price ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
                    Price
                  </span>
                  <span
                    style={{
                      fontSize: "38px",
                      fontWeight: 900,
                      color: "#faad13",
                      letterSpacing: "-0.5px",
                    }}
                  >
                    {price}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Right Photo Area (if image provided) */}
            {image ? (
              <div
                style={{
                  width: "360px",
                  height: "360px",
                  borderRadius: "24px",
                  overflow: "hidden",
                  border: "2px solid rgba(255, 255, 255, 0.15)",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
                  display: "flex",
                  position: "relative",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            ) : null}
          </div>

          {/* Footer Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              paddingTop: "16px",
              marginTop: "16px",
              fontSize: "14px",
              color: "#64748b",
              fontWeight: 700,
            }}
          >
            <span>Vijayawada • Guntur • Amaravati • Mangalagiri • Tadepalli</span>
            <span style={{ color: "#faad13" }}>www.roadfacing.com</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown image error";
    return new Response(`Failed to generate the image: ${message}`, {
      status: 500,
    });
  }
}
