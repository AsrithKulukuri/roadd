"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Navigation, ArrowRight } from "lucide-react";
import L from "leaflet";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/property/property-card";

// Fix for default marker icons in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

import { usePropertiesStore } from "@/stores/properties-store";
import { formatPriceCompact } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

function LocationMarker({
  position,
  setPosition,
}: {
  position: L.LatLng | null;
  setPosition: (pos: L.LatLng) => void;
}) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setPosition(newPos);
          map.flyTo(newPos, map.getZoom());
        }
      },
    }),
    [setPosition, map]
  );

  // Custom icon for the draggable user marker
  const customIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return position === null ? null : (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={customIcon}
    >
      <Popup minWidth={90}>
        <div className="font-medium text-center">
          <strong>Your Location</strong>
          <br />
          {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
        </div>
      </Popup>
    </Marker>
  );
}

// Center Map Component to programmatically change view
function CenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

function ZoomListener({ onZoomLimit, properties }: { onZoomLimit: (isAtLimit: boolean, propertyTitle?: string) => void, properties: any[] }) {
  const map = useMapEvents({
    zoomend: () => {
      const isAtLimit = map.getZoom() >= 15;
      if (isAtLimit) {
        const center = map.getCenter();
        let closestProp: any = null;
        let minDistance = Infinity;
        
        properties.forEach(p => {
          const propLatLng = new L.LatLng(p.location.latitude, p.location.longitude);
          const dist = center.distanceTo(propLatLng);
          if (dist < minDistance) {
            minDistance = dist;
            closestProp = p;
          }
        });
        onZoomLimit(true, closestProp?.title);
      } else {
        onZoomLimit(false);
      }
    }
  });
  return null;
}

function getSmartFilteredProperties(mapProperties: any[], query: string, typeParam?: string | null) {
  let result = mapProperties;

  // 1. Filter by URL type parameter if provided (e.g. ?type=apartment or ?type=rent)
  if (typeParam && typeParam !== "all" && typeParam !== "buy") {
    const typeLower = typeParam.toLowerCase();
    if (["sale", "rent"].includes(typeLower)) {
      result = result.filter(p => p.listingType === typeLower);
    } else {
      result = result.filter(p => 
        p.propertyType.toLowerCase().includes(typeLower) || 
        p.listingType.toLowerCase() === typeLower
      );
    }
  }

  if (!query.trim()) return result;

  const rawTerm = query.toLowerCase().trim();
  const stopWords = ["in", "at", "near", "for", "a", "an", "the", "of"];
  const tokens = rawTerm.split(/\s+/).filter(t => !stopWords.includes(t));

  return result.filter(p => {
    const pType = (p.propertyType || "").toLowerCase().replace('-', ' ');
    const lType = (p.listingType || "").toLowerCase();
    const city = (p.location?.city || "").toLowerCase();
    const locality = (p.location?.locality || "").toLowerCase();
    const address = (p.location?.address || "").toLowerCase();
    const title = (p.title || "").toLowerCase();
    const desc = (p.description || "").toLowerCase();

    const searchableText = `${title} ${locality} ${city} ${address} ${pType} ${lType} ${desc}`;

    if (tokens.length > 0) {
      return tokens.every(token => {
        // Strip trailing 's' for plural match (e.g., apartments -> apartment, villas -> villa, plots -> plot)
        const stem = token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token;
        
        // Category alias matching
        if (stem === "apartment" || token === "flats" || token === "flat") {
          return pType.includes("apartment") || searchableText.includes("apartment");
        }
        if (stem === "villa" || token === "house" || token === "houses") {
          return pType.includes("villa") || searchableText.includes("villa");
        }
        if (stem === "plot" || stem === "land") {
          return pType.includes("land") || pType.includes("plot") || searchableText.includes("plot") || searchableText.includes("land");
        }
        if (stem === "shop" || stem === "office" || token === "commercial") {
          return pType.includes("commercial") || searchableText.includes("commercial");
        }

        return searchableText.includes(token) || searchableText.includes(stem);
      });
    }

    return searchableText.includes(rawTerm);
  });
}

interface PropertyMapProps {
  filteredItems?: any[];
}

export default function PropertyMap({ filteredItems }: PropertyMapProps = {}) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("location") || searchParams.get("q") || searchParams.get("search") || "";
  const initialType = searchParams.get("type") || searchParams.get("category") || null;
  
  const properties = usePropertiesStore((state) => state.properties);
  const mapProperties = useMemo(() => properties.filter((p) => p.showOnMap && p.status !== 'sold'), [properties]);

  const activeFiltered = useMemo(() => {
    if (filteredItems && Array.isArray(filteredItems)) {
      return filteredItems;
    }
    return getSmartFilteredProperties(mapProperties, initialQuery, initialType);
  }, [filteredItems, mapProperties, initialQuery, initialType]);

  const [position, setPosition] = useState<L.LatLng | null>(
    activeFiltered.length > 0 && activeFiltered[0].location?.latitude && activeFiltered[0].location?.longitude
      ? new L.LatLng(activeFiltered[0].location.latitude, activeFiltered[0].location.longitude)
      : new L.LatLng(16.5062, 80.6480) // Default to Vijayawada
  );
  
  const [searchPlace, setSearchPlace] = useState(initialQuery);
  const [filteredProperties, setFilteredProperties] = useState(activeFiltered);
  const [isZoomRestricted, setIsZoomRestricted] = useState(false);
  const [restrictedPropertyTitle, setRestrictedPropertyTitle] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (filteredItems && Array.isArray(filteredItems)) {
      setFilteredProperties(filteredItems);
      if (filteredItems.length > 0 && filteredItems[0].location?.latitude && filteredItems[0].location?.longitude) {
        setPosition(new L.LatLng(filteredItems[0].location.latitude, filteredItems[0].location.longitude));
      }
      return;
    }

    const query = searchParams.get("location") || searchParams.get("q") || searchParams.get("search") || "";
    const typeParam = searchParams.get("type") || searchParams.get("category") || null;
    setSearchPlace(query);
    const matches = getSmartFilteredProperties(mapProperties, query, typeParam);
    setFilteredProperties(matches);
    if (matches.length > 0 && (query.trim() !== "" || typeParam !== null)) {
      if (matches[0].location?.latitude && matches[0].location?.longitude) {
        setPosition(new L.LatLng(matches[0].location.latitude, matches[0].location.longitude));
      }
    }
  }, [filteredItems, searchParams, mapProperties]);

  const handleZoomLimit = (isAtLimit: boolean, title?: string) => {
    setIsZoomRestricted(isAtLimit);
    if (isAtLimit && title) {
      setRestrictedPropertyTitle(title);
    }
  };

  const handleSearchPlace = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // If search is empty, reset the filter
    if (!searchPlace.trim()) {
      setFilteredProperties(mapProperties);
      return;
    }
    
    const matches = getSmartFilteredProperties(mapProperties, searchPlace);
    
    if (matches.length > 0) {
      setFilteredProperties(matches);
      // Center on the first match
      setPosition(new L.LatLng(matches[0].location.latitude, matches[0].location.longitude));
    } else {
      alert(`No properties found matching "${searchPlace}". Try a different location or keyword.`);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition(new L.LatLng(latitude, longitude));
        },
        (err) => {
          console.error("Geolocation error:", err);
          alert("Unable to retrieve your location. Please check browser permissions.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="relative w-full flex flex-col md:flex-row gap-0 border border-border-default/50 rounded-3xl overflow-hidden bg-bg-card shadow-sm h-auto md:h-[600px]">
      {/* Map Control Panel */}
      <div className="w-full md:w-80 flex-shrink-0 p-6 flex flex-col gap-6 bg-bg-card z-10 border-b md:border-b-0 md:border-r border-border-default/50 shadow-[0_4px_24px_rgba(0,0,0,0.08)] md:shadow-[4px_0_24px_rgba(0,0,0,0.08)]">
        <div>
          <h2 className="font-heading text-xl font-bold text-text-primary mb-2">
            Map Search
          </h2>
          <p className="text-sm text-text-secondary">
            Drag the orange pin, click on the map, or paste coordinates to explore areas.
          </p>
        </div>

        <form onSubmit={handleSearchPlace} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
              Search Location
            </label>
            <div className="flex gap-2">
              <Input
                value={searchPlace}
                onChange={(e) => setSearchPlace(e.target.value)}
                placeholder="e.g. MVP Colony, Madhapur..."
                className="bg-bg-primary/50 flex-1"
              />
              <Button type="submit" variant="amber" size="icon" className="shrink-0">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button 
            type="button"
            className="w-full mt-2"
            onClick={handleGetLocation}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Find My Location
          </Button>
        </form>

        <div className="mt-auto pt-6 border-t border-border-default/50">
          <h3 className="font-medium text-text-primary mb-3 text-sm">Property Legend</h3>
          <div className="space-y-2 text-sm text-text-secondary flex flex-col">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span>Available Properties</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span>Your Custom Pin</span>
            </div>
          </div>
        </div>
      </div>

      {/* The Map itself */}
      <div className="flex-1 w-full flex flex-col z-0 relative bg-bg-primary min-h-[55vh] md:min-h-full">
        <MapContainer
          ref={mapRef}
          center={position ? [position.lat, position.lng] : [17.4326, 78.4071]}
          zoom={12}
          maxZoom={15}
          scrollWheelZoom={false}
          className="w-full h-full flex-1 min-h-[55vh] md:min-h-full"
        >
          <ZoomListener onZoomLimit={handleZoomLimit} properties={filteredProperties} />
          {/* Using Esri World Imagery tiles for an earth view look */}
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          
          <LocationMarker position={position} setPosition={setPosition} />
          
          {position && <CenterMap center={[position.lat, position.lng]} />}

          {/* Render Active Map Properties */}
          {filteredProperties.map((prop) => {
            let distanceText = "";
            if (position) {
              const propLatLng = new L.LatLng(prop.location.latitude, prop.location.longitude);
              const distInMeters = position.distanceTo(propLatLng);
              distanceText = `${(distInMeters / 1000).toFixed(1)} km`;
            }
            
            return (
              <Marker key={prop.id} position={[prop.location.latitude, prop.location.longitude]}>
                <Popup className="road-popup">
                  <div className="p-2 min-w-[180px]">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-amber-600">{formatPriceCompact(prop.price)}</div>
                      {distanceText && (
                        <div className="text-[10px] bg-bg-primary px-1.5 py-0.5 rounded text-text-secondary border border-border-default">
                          {distanceText} away
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-medium text-text-primary leading-tight mb-1 line-clamp-2">
                      {prop.title}
                    </div>
                    <div className="text-xs text-text-secondary capitalize mb-3">{prop.listingType} • {prop.propertyType.replace('-', ' ')}</div>
                    
                    <Link href={`/properties/${prop.slug}`}>
                      <Button variant="amber" size="sm" className="w-full h-8 text-xs">
                        See Details
                      </Button>
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Privacy Zoom Overlay */}
        {isZoomRestricted && (
          <div className="absolute inset-0 z-[1000] bg-bg-primary/70 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300">
            <div className="bg-bg-card border border-border-default shadow-elevated rounded-3xl p-8 max-w-md w-full text-center flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-amber-primary/10 rounded-full flex items-center justify-center mb-2">
                <span className="text-3xl">🔒</span>
              </div>
              <h3 className="font-heading text-xl font-bold text-text-primary">
                Exact Location Protected
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                You've reached the maximum zoom level. To ensure the privacy of our property owners, exact street views are hidden. 
                <br/><br/>
                Want to know more or arrange a site visit?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.setZoom(13);
                      setIsZoomRestricted(false);
                    }
                  }}
                >
                  Zoom Out
                </Button>
                <Button variant="amber" className="flex-1 shadow-amber-glow" asChild>
                  <a 
                    href={`https://wa.me/918977311418?text=${encodeURIComponent(restrictedPropertyTitle ? `Hi! I'm exploring properties on the map and would like to know the exact location details for "${restrictedPropertyTitle}".` : "Hi! I'm exploring properties on the map and would like to know the exact location details.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Contact Agent
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Nearby/Filtered Properties Grid */}
      <div className="pt-4 px-2">
        <h2 className="text-xl font-heading font-bold mb-6 text-text-primary">
          {filteredProperties.length === mapProperties.length 
            ? "Featured Map Properties" 
            : `Properties found for "${searchPlace}" (${filteredProperties.length})`}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </div>
    </div>
  );
}
