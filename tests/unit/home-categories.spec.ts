import { expect, test } from "@playwright/test";
import { categoryDestination, categorySearchHref } from "@/lib/home-category-links";
import { isPropertyOnlyHref } from "@/lib/property-visibility";
import { useContentStore } from "@/stores/content-store";

test("project categories remain visible while property categories respect the switch", () => {
  for (const type of ["apartment", "villa", "venture"]) {
    const href = categorySearchHref("projects", type);
    expect(categoryDestination(href)).toBe("projects");
    expect(isPropertyOnlyHref(href)).toBe(false);
  }
  expect(categorySearchHref("properties", "resale")).toBe("/search?type=buy&saleType=resale");
  expect(isPropertyOnlyHref(categorySearchHref("properties", "villa"))).toBe(true);
});

test("category saves report failure, roll back, and can be retried without losing the draft", async () => {
  const originalFetch = globalThis.fetch;
  const originalCategories = useContentStore.getState().homeCategories;
  const draft = { name: "New project category", type: "villa", href: categorySearchHref("projects", "villa"), icon: "Home", description: "Villas", count: 0, image: "/images/villa.png" };
  try {
    globalThis.fetch = async () => Response.json({ error: "Save failed" }, { status: 500 });
    expect(await useContentStore.getState().addCategory(draft)).toBe(false);
    expect(useContentStore.getState().homeCategories).toEqual(originalCategories);
    globalThis.fetch = async () => Response.json({ success: true });
    expect(await useContentStore.getState().addCategory(draft)).toBe(true);
    const saved = useContentStore.getState().homeCategories.at(-1)!;
    expect(saved.href).toBe("/search?type=projects&propertyType=villa");
    globalThis.fetch = async () => Response.json({ error: "Save failed" }, { status: 500 });
    expect(await useContentStore.getState().updateCategory(saved.id, { name: "Edited" })).toBe(false);
    expect(useContentStore.getState().homeCategories.at(-1)?.name).toBe(draft.name);
  } finally {
    globalThis.fetch = originalFetch;
    useContentStore.setState({ homeCategories: originalCategories });
  }
});
