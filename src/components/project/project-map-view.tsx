import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

// Custom amber-styled pin icon
function buildIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="40" height="52">
      <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter>
      <path d="M20 0C8.954 0 0 9.043 0 20.2 0 34.3 20 52 20 52S40 34.3 40 20.2C40 9.043 31.046 0 20 0Z"
            fill="#F59E0B" filter="url(#shadow)"/>
      <circle cx="20" cy="20" r="10" fill="white" opacity="0.95"/>
      <circle cx="20" cy="20" r="6" fill="#F59E0B"/>
    </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [40, 52], iconAnchor: [20, 52], popupAnchor: [0, -54] });
}

function FlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, 15, { animate: true, duration: 1.5 }); }, [center[0], center[1]]);
  return null;
}

// Auto-opens the popup once mounted
function AutoOpenMarker({ center, children }: { center: [number, number]; children: React.ReactNode }) {
  const markerRef = useRef<L.Marker>(null);
  useEffect(() => {
    const t = setTimeout(() => markerRef.current?.openPopup(), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <Marker position={center} icon={buildIcon()} ref={markerRef}>
      {children}
    </Marker>
  );
}

interface ProjectMapViewProps {
  latitude: number;
  longitude: number;
  projectName: string;
  locality: string;
  city: string;
  projectType: string;
}

export default function ProjectMapView({
  latitude,
  longitude,
  projectName,
  locality,
  city,
  projectType,
}: ProjectMapViewProps) {
  const center: [number, number] = [latitude, longitude];

  const typeLabel =
    projectType === "apartment" ? "Apartment Project"
    : projectType === "villa"   ? "Villa Project"
    : "Venture / Layout";

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-border-default z-0 relative">
      <MapContainer
        center={center}
        zoom={15}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={false}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={
            process.env.NEXT_PUBLIC_MAP_TILE_URL ||
            (process.env.NEXT_PUBLIC_CARTO_API_KEY
              ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
          }
          maxNativeZoom={19}
          maxZoom={20}
        />
        <FlyTo center={center} />
        <AutoOpenMarker center={center}>
          <Popup closeButton={false} offset={[0, -8]}>
            <div style={{ minWidth: "180px", padding: "2px 4px" }}>
              <p style={{ fontWeight: 800, fontSize: "13px", marginBottom: "2px", color: "#0f172a" }}>
                {projectName}
              </p>
              <p style={{ fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>
                {locality}, {city}
              </p>
              <span style={{
                display: "inline-block", background: "#F59E0B22", color: "#B45309",
                borderRadius: "9999px", padding: "1px 8px", fontSize: "10px", fontWeight: 700,
              }}>
                {typeLabel}
              </span>
            </div>
          </Popup>
        </AutoOpenMarker>
      </MapContainer>
    </div>
  );
}
