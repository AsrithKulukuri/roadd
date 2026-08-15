import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { uploadToS3, deleteFromS3 } from "@/lib/aws/storage-utils";

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
        set({ banners: data as Banner[] });
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
      // 1. Upload Desktop Image directly to S3
      const deskUpload = await uploadToS3({
        file: desktopFile,
        folder: "banners",
      });

      if (!deskUpload.success || !deskUpload.fileUrl) {
        throw new Error(deskUpload.error || "Failed to upload desktop banner to S3");
      }
      const imageUrl = deskUpload.fileUrl;

      // 2. Upload Mobile Image (Optional) to S3
      let mobileImageUrl: string | null = null;
      if (mobileFile) {
        const mobUpload = await uploadToS3({
          file: mobileFile,
          folder: "banners",
        });

        if (mobUpload.success && mobUpload.fileUrl) {
          mobileImageUrl = mobUpload.fileUrl;
        }
      }

      // 3. Insert into Supabase
      const fullPayload = {
        ...bannerData,
        image_url: imageUrl,
        mobile_image_url: mobileImageUrl,
      };

      const { error: insertError } = await supabase.from("banners").insert(fullPayload);

      if (insertError) {
        // Fallback to base columns if new columns don't exist yet
        console.warn("Retrying with base banner columns:", insertError.message);
        const basePayload = {
          title: bannerData.title,
          link_url: bannerData.link_url,
          image_url: imageUrl,
          is_active: bannerData.is_active ?? true,
          order_index: bannerData.order_index ?? 0,
        };
        const { error: retryError } = await supabase.from("banners").insert(basePayload);
        if (retryError) throw retryError;
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

      const updatePayload: any = {
        ...updates,
      };
      if (imageUrl) updatePayload.image_url = imageUrl;
      if (mobileImageUrl !== undefined) updatePayload.mobile_image_url = mobileImageUrl;

      const { error } = await supabase.from("banners").update(updatePayload).eq("id", id);
      
      if (error) {
        // Fallback to base columns if update fails
        console.warn("Retrying banner update with base fields:", error.message);
        const { error: retryError } = await supabase.from("banners").update({
          title: updates.title,
          link_url: updates.link_url,
          is_active: updates.is_active,
          order_index: updates.order_index,
          ...(imageUrl ? { image_url: imageUrl } : {}),
        }).eq("id", id);
        if (retryError) throw retryError;
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
      const keysToDelete: string[] = [];
      if (imageUrl) keysToDelete.push(imageUrl);
      if (mobileImageUrl) keysToDelete.push(mobileImageUrl);

      if (keysToDelete.length > 0) {
        await deleteFromS3(keysToDelete);
      }

      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;

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
