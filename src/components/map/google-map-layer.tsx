"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { GOOGLE_MAPS_AUTH_ERROR, loadGoogleMaps } from "@/lib/google-maps-loader";

type MapType = "roadmap" | "hybrid" | "terrain";
type GoogleGridLayer = typeof L.gridLayer & {
  googleMutant: (options: L.GridLayerOptions & { type: MapType }) => L.GridLayer;
};

/** Google supplies the basemap; Leaflet retains Road's markers and drawing tools. */
export function GoogleMapLayer({ type = "roadmap" }: { type?: MapType }) {
  return <GoogleMapLayerInstance key={type} type={type} />;
}

function GoogleMapLayerInstance({ type }: { type: MapType }) {
  const map = useMap();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let disposed = false;
    let layer: L.GridLayer | undefined;
    const container = map.getContainer();
    const fail = () => { if (!disposed) setStatus("error"); };
    window.addEventListener(GOOGLE_MAPS_AUTH_ERROR, fail);
    const timeout = window.setTimeout(fail, 30000);

    async function mount() {
      try {
        await loadGoogleMaps();
        await import("leaflet.gridlayer.googlemutant");
        if (disposed) return;
        layer = (L.gridLayer as GoogleGridLayer).googleMutant({ type, maxZoom: 20 });
        layer.once("tileload", () => {
          if (disposed) return;
          window.clearTimeout(timeout);
          container.dataset.mapProvider = "google";
          setStatus("ready");
        });
        layer.addTo(map);
      } catch {
        // Never log the API request URL: it contains the browser key.
        fail();
      }
    }
    void mount();
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      window.removeEventListener(GOOGLE_MAPS_AUTH_ERROR, fail);
      layer?.remove();
      delete container.dataset.mapProvider;
    };
  }, [map, type]);

  if (status === "ready") return null;
  return createPortal(
    <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-slate-100/95 p-6 text-center text-sm text-slate-700"
      role={status === "error" ? "alert" : "status"}
      onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      {status === "loading" ? "Loading Google Maps…" : (
        <div>
          <p>Google Maps is unavailable. Please check your connection and reload.</p>
          <button type="button" className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-white" onClick={() => window.location.reload()}>Reload map</button>
        </div>
      )}
    </div>, map.getContainer(),
  );
}
