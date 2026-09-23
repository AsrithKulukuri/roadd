"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface SiteFeatures { propertiesEnabled: boolean; ready: boolean; error: string; refresh: () => Promise<void>; save: (enabled: boolean) => Promise<void>; }

const SiteFeaturesContext = createContext<SiteFeatures>({
  propertiesEnabled: false,
  ready: false,
  error: "",
  refresh: async () => {},
  save: async () => {},
});

export const useSiteFeatures = () => useContext(SiteFeaturesContext);

export function SiteFeaturesProvider({ children, initialFeatures }: { children: React.ReactNode; initialFeatures?: { propertiesEnabled: boolean } | null }) {
  const [propertiesEnabled, setEnabled] = useState(initialFeatures?.propertiesEnabled ?? false);
  const [ready, setReady] = useState(!!initialFeatures);
  const [error, setError] = useState("");
  const revision = useRef(0);
  const saving = useRef(false);
  const refresh = useCallback(async () => {
    if (saving.current) return;
    const current = ++revision.current;
    try {
      const response = await fetch("/api/site-features", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || typeof data.propertiesEnabled !== "boolean") throw new Error("Unable to load site settings.");
      if (current !== revision.current) return;
      setEnabled(data.propertiesEnabled);
      setReady(true);
      setError("");
    } catch {
      if (current === revision.current) setError("Unable to load site settings. Please retry.");
    }
  }, []);
  const save = useCallback(async (enabled: boolean) => {
    saving.current = true;
    ++revision.current;
    try {
      const response = await fetch("/api/site-features", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertiesEnabled: enabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save settings.");
      setEnabled(data.propertiesEnabled);
      setReady(true);
      setError("");
      const channel = new BroadcastChannel("road-site-features");
      channel.postMessage("refresh");
      channel.close();
    } finally {
      saving.current = false;
    }
  }, []);
  useEffect(() => {
    const initialRefresh = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    window.addEventListener("focus", refresh);
    const channel = new BroadcastChannel("road-site-features");
    channel.onmessage = () => void refresh();
    return () => { clearTimeout(initialRefresh); clearInterval(interval); window.removeEventListener("focus", refresh); channel.close(); };
  }, [refresh]);
  return <SiteFeaturesContext.Provider value={{ propertiesEnabled, ready, error, refresh, save }}>{children}</SiteFeaturesContext.Provider>;
}
