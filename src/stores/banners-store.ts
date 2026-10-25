import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { uploadToS3, resolveMediaUrl } from "@/lib/aws/storage-utils";

export interface Banner {
  id: string;
  image_url: string;
  mobile_image_url?: string | null;
  title: string | null;
  subtitle?: string | null;
  button_text?: string | null;
  link_url: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

interface BannersStore {
  banners: Banner[];
  isLoading: boolean;
  fetchBanners: (includeInactive?: boolean) => Promise<void>;
  addBanner: (
    banner: Omit<Banner, "id" | "created_at">,
    desktopFile: File,
    mobileFile?: File | null
  ) => Promise<boolean>;
  updateBanner: (
    id: string,
    updates: Partial<Banner>,
    desktopFile?: File | null,
    mobileFile?: File | null
  ) => Promise<boolean>;
  deleteBanner: (id: string, imageUrl: string, mobileImageUrl?: string | null) => Promise<boolean>;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      headers["Authorization"] = `Bearer ${data.session.access_token}`;
    }
  } catch {}
  return headers;
}

export const useBannersStore = create<BannersStore>((set, get) => ({
  banners: [],
  isLoading: false,

  fetchBanners: async (includeInactive = false) => {
    set({ isLoading: true });
    try {
      let query = supabase.from("banners").select("*").order("order_index", { ascending: true });
      if (!includeInactive) {
        query = query.eq("is_active", true);
      }
      const { data, error } = await query;
      if (!error && data) {
        const resolved = (data as Banner[]).map((b) => ({
          ...b,
          image_url: resolveMediaUrl(b.image_url),
          mobile_image_url: b.mobile_image_url ? resolveMediaUrl(b.mobile_image_url) : null,
        }));
        set({ banners: resolved });
      }
    } catch (error) {
      console.error("Failed to fetch banners:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  addBanner: async (bannerData, desktopFile, mobileFile) => {
    set({ isLoading: true });
    try {
      const primaryFile = desktopFile || mobileFile;
      if (!primaryFile) {
        throw new Error("No image file provided");
      }

      // 1. Upload Desktop / Primary Image directly to S3
      const deskUpload = await uploadToS3({
        file: primaryFile,
        folder: "banners",
      });

      if (!deskUpload.success || !deskUpload.fileUrl) {
        throw new Error(deskUpload.error || "Failed to upload banner to S3");
      }
      const imageUrl = deskUpload.fileUrl;

      // 2. Upload Mobile Image (if a distinct mobile file was selected)
      let mobileImageUrl: string | null = null;
      if (mobileFile && desktopFile && mobileFile !== desktopFile) {
        const mobUpload = await uploadToS3({
          file: mobileFile,
          folder: "banners",
        });

        if (mobUpload.success && mobUpload.fileUrl) {
          mobileImageUrl = mobUpload.fileUrl;
        }
      } else if (mobileFile && !desktopFile) {
        mobileImageUrl = imageUrl;
      }

      // 3. Save via authenticated server endpoint (guaranteed with supabaseAdmin)
      const fullPayload = {
        ...bannerData,
        image_url: imageUrl,
        mobile_image_url: mobileImageUrl,
      };

      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/banners/save", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(fullPayload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add banner");
      }
      
      await get().fetchBanners(true);
      return true;
    } catch (error) {
      console.error("Failed to add banner:", error);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  updateBanner: async (id, updates, desktopFile, mobileFile) => {
    set({ isLoading: true });
    try {
      let imageUrl = updates.image_url;
      let mobileImageUrl = updates.mobile_image_url;

      if (desktopFile) {
        const deskUpload = await uploadToS3({
          file: desktopFile,
          folder: "banners",
        });

        if (!deskUpload.success || !deskUpload.fileUrl) {
          throw new Error(deskUpload.error || "Failed to upload new desktop banner to S3");
        }
        imageUrl = deskUpload.fileUrl;
      }

      if (mobileFile) {
        const mobUpload = await uploadToS3({
          file: mobileFile,
          folder: "banners",
        });

        if (!mobUpload.success || !mobUpload.fileUrl) {
          throw new Error(mobUpload.error || "Failed to upload new mobile banner to S3");
        }
        mobileImageUrl = mobUpload.fileUrl;
      }

      const updatePayload: Record<string, unknown> = {
        id,
        ...updates,
      };
      if (imageUrl) updatePayload.image_url = imageUrl;
      if (mobileImageUrl !== undefined) updatePayload.mobile_image_url = mobileImageUrl;

      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/banners/save", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update banner");
      }

      await get().fetchBanners(true);
      return true;
    } catch (error) {
      console.error("Failed to update banner:", error);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteBanner: async (id, imageUrl, mobileImageUrl) => {
    set({ isLoading: true });
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/banners/delete", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ id, imageUrl, mobileImageUrl }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to delete banner");
      }

      // Optimistically remove from state & refetch
      set((state) => ({
        banners: state.banners.filter((b) => b.id !== id),
      }));

      await get().fetchBanners(true);
      return true;
    } catch (error) {
      console.error("Failed to delete banner:", error);
      return false;
    } finally {
      set({ isLoading: false });
    }
  }
}));
