"use client";

import { useSiteFeatures } from "@/components/providers/site-features-provider";
import { usePropertiesStore } from "@/stores/properties-store";
import type { Property } from "@/types/property";

const EMPTY_PROPERTIES: Property[] = [];

/** Filter at render time so persisted listings cannot reappear while hidden. */
export function useVisibleProperties() {
  const { propertiesEnabled } = useSiteFeatures();
  const properties = usePropertiesStore(state => state.properties);
  return propertiesEnabled ? properties : EMPTY_PROPERTIES;
}

export function PropertyFeature({ children }: { children: React.ReactNode }) {
  const { propertiesEnabled } = useSiteFeatures();
  return propertiesEnabled ? children : null;
}
