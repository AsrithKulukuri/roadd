"use client";

import { GoogleMap } from "@/components/map/google-map";

interface ProjectMapViewProps {
  latitude: number;
  longitude: number;
  projectName: string;
  locality: string;
  city: string;
  projectType: string;
  distanceText?: string;
}

export default function ProjectMapView({
  latitude,
  longitude,
  projectName,
  locality,
  city,
  projectType,
  distanceText,
}: ProjectMapViewProps) {
  const safeLat =
    typeof latitude === "number" && !isNaN(latitude) && latitude !== 0
      ? latitude
      : 16.5062;
  const safeLng =
    typeof longitude === "number" && !isNaN(longitude) && longitude !== 0
      ? longitude
      : 80.648;

  const typeLabel =
    projectType === "apartment"
      ? "Apartment Project"
      : projectType === "villa"
      ? "Villa Project"
      : "Venture / Layout";

  const infoHtml = `
    <div style="min-width: 180px; padding: 4px 6px; font-family: system-ui, sans-serif;">
      <p style="font-weight: 800; font-size: 13px; margin: 0 0 2px; color: #0f172a;">${projectName}</p>
      <p style="font-size: 11px; color: #64748b; margin: 0 0 4px;">
        ${locality}, ${city}
        ${distanceText ? `<span style="display:block; color:#b45309; font-weight:700; margin-top:2px;">📍 ${distanceText}</span>` : ""}
      </p>
      <span style="display:inline-block; background:#F59E0B22; color:#B45309; border-radius:9999px; padding:2px 8px; font-size:10px; font-weight:700;">
        ${typeLabel}
      </span>
    </div>
  `;

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-border-default z-0 relative">
      <GoogleMap
        center={{ lat: safeLat, lng: safeLng }}
        zoom={15}
        interactive={true}
        markers={[
          {
            id: "project-pin",
            position: { lat: safeLat, lng: safeLng },
            title: projectName,
            color: "#F59E0B",
            infoContent: infoHtml,
          },
        ]}
        className="w-full h-full min-h-[300px]"
      />
    </div>
  );
}
