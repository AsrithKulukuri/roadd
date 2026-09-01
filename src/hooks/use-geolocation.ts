"use client";

import { useCallback, useEffect, useState } from "react";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function useGeolocation() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setError(null);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Observe permission state only. Location access is requested by explicit UI actions.
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        setPermissionStatus(result.state);

        result.onchange = () => {
          setPermissionStatus(result.state);
          if (result.state !== "granted") {
            setCoordinates(null);
          }
        };
      }).catch(() => setPermissionStatus(null));
    }
  }, []);

  return { coordinates, error, requestLocation, permissionStatus };
}
