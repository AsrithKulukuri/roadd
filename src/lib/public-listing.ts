// Apply before serializing listing records for any public response.
export function publicListing<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => publicListing(item)) as T;
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  return { ...Object.fromEntries(Object.entries(record).filter(([key]) =>
    !/(phone|whatsapp|email|credentials|brochure_?url|crdaDocumentUrl|crda_document_url)/i.test(key)
  ).map(([key, item]) => [key, publicListing(item)])),
    ...(record.brochureUrl ? { hasBrochure: true } : {}),
  } as T;
}
