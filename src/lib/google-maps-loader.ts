// Load the Maps JavaScript API once, even when several Road maps are visible.
let loading: Promise<void> | undefined;
let authenticationFailed = false;
export const GOOGLE_MAPS_AUTH_ERROR = "road:google-maps-auth-error";

type MapsWindow = Window & {
  google?: { maps?: { Map?: unknown } };
  roadGoogleMapsReady?: () => void;
  gm_authFailure?: () => void;
};

export function loadGoogleMaps(): Promise<void> {
  const mapsWindow = window as MapsWindow;
  if (authenticationFailed) return Promise.reject(new Error("Google Maps authentication failed"));
  if (mapsWindow.google?.maps?.Map) return Promise.resolve();
  if (loading) return loading;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return Promise.reject(new Error("Google Maps key is missing"));

  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const timer = window.setTimeout(() => {
      reject(new Error("Google Maps loading timed out"));
    }, 20000);
    const previousAuthFailure = mapsWindow.gm_authFailure;
    mapsWindow.gm_authFailure = () => {
      authenticationFailed = true;
      window.clearTimeout(timer);
      reject(new Error("Google Maps authentication failed"));
      window.dispatchEvent(new Event(GOOGLE_MAPS_AUTH_ERROR));
      previousAuthFailure?.();
    };
    mapsWindow.roadGoogleMapsReady = () => {
      window.clearTimeout(timer);
      resolve();
      delete mapsWindow.roadGoogleMapsReady;
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Google Maps could not be loaded"));
    };
    const params = new URLSearchParams({
      key, v: "quarterly", loading: "async", callback: "roadGoogleMapsReady",
      language: "en", region: "IN",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    document.head.appendChild(script);
  });
  return loading;
}
