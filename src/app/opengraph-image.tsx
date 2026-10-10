import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "Road Facing — Real Projects. Real People. Real Updates";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#090d16",
          backgroundImage:
            "radial-gradient(circle at 10% 20%, rgba(250, 173, 19, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(250, 173, 19, 0.1) 0%, transparent 50%)",
          color: "#ffffff",
          padding: "64px 72px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Top Header Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                backgroundColor: "#faad13",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "26px",
                color: "#020617",
              }}
            >
              R
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "30px",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  color: "#ffffff",
                }}
              >
                ROAD <span style={{ color: "#faad13" }}>FACING</span>
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Real Estate Portal • AP Capital Region
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "999px",
              backgroundColor: "rgba(250, 173, 19, 0.12)",
              border: "1px solid rgba(250, 173, 19, 0.35)",
              color: "#faad13",
              fontSize: "14px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            ✓ RERA & CRDA Verified
          </div>
        </div>

        {/* Center Main Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "980px" }}>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              margin: 0,
            }}
          >
            Real Projects. Real People. <br />
            <span style={{ color: "#faad13" }}>Real Video Updates.</span>
          </h1>
          <p
            style={{
              fontSize: "24px",
              color: "#94a3b8",
              lineHeight: 1.45,
              fontWeight: 500,
              margin: 0,
            }}
          >
            Explore verified apartments, villas, and plots across Vijayawada, Guntur & Amaravati with 100% on-ground transparency.
          </p>
        </div>

        {/* Bottom Feature Badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            paddingTop: "24px",
            borderTop: "1px solid rgba(148, 163, 184, 0.2)",
          }}
        >
          {["Vijayawada", "Guntur", "Amaravati", "Mangalagiri", "Tadepalli"].map((loc) => (
            <div
              key={loc}
              style={{
                padding: "8px 18px",
                borderRadius: "10px",
                backgroundColor: "rgba(30, 41, 59, 0.7)",
                border: "1px solid rgba(148, 163, 184, 0.15)",
                fontSize: "15px",
                fontWeight: 700,
                color: "#e2e8f0",
              }}
            >
              📍 {loc}
            </div>
          ))}
          <div
            style={{
              marginLeft: "auto",
              fontSize: "18px",
              fontWeight: 800,
              color: "#faad13",
            }}
          >
            roadfacing.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
