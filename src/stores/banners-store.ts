import { create } from "zustand";
import { supabase } from "@/lib/supabase";

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
      // 1. Upload Desktop Image
      const deskExt = desktopFile.name.split('.').pop() || 'jpg';
      const deskPath = `banners/desktop_${Date.now()}_${Math.random().toString(36).substring(7)}.${deskExt}`;
      
      const { data: deskUpload, error: deskError } = await supabase.storage
        .from('banners')
        .upload(deskPath, desktopFile);

      if (deskError) throw deskError;
      const { data: deskPub } = supabase.storage.from('banners').getPublicUrl(deskUpload.path);
      const imageUrl = deskPub.publicUrl;

      // 2. Upload Mobile Image (Optional)
      let mobileImageUrl: string | null = null;
      if (mobileFile) {
        const mobExt = mobileFile.name.split('.').pop() || 'jpg';
        const mobPath = `banners/mobile_${Date.now()}_${Math.random().toString(36).substring(7)}.${mobExt}`;
        const { data: mobUpload, error: mobError } = await supabase.storage
          .from('banners')
          .upload(mobPath, mobileFile);

        if (!mobError && mobUpload) {
          const { data: mobPub } = supabase.storage.from('banners').getPublicUrl(mobUpload.path);
          mobileImageUrl = mobPub.publicUrl;
        }
      }

      // 3. Insert into Supabase with fallback if custom columns are missing
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
        const deskExt = desktopFile.name.split('.').pop() || 'jpg';
        const deskPath = `banners/desktop_${Date.now()}_${Math.random().toString(36).substring(7)}.${deskExt}`;
        const { data: deskUpload, error: deskError } = await supabase.storage
          .from('banners')
          .upload(deskPath, desktopFile);

        if (deskError) throw deskError;
        const { data: deskPub } = supabase.storage.from('banners').getPublicUrl(deskUpload.path);
        imageUrl = deskPub.publicUrl;
      }

      if (mobileFile) {
        const mobExt = mobileFile.name.split('.').pop() || 'jpg';
        const mobPath = `banners/mobile_${Date.now()}_${Math.random().toString(36).substring(7)}.${mobExt}`;
        const { data: mobUpload, error: mobError } = await supabase.storage
          .from('banners')
          .upload(mobPath, mobileFile);

        if (mobError) throw mobError;
        const { data: mobPub } = supabase.storage.from('banners').getPublicUrl(mobUpload.path);
        mobileImageUrl = mobPub.publicUrl;
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
      const s3Domain = '.amazonaws.com/';
      const sbToken = '/public/banners/';

      const deleteStorageFile = async (url: string) => {
        try {
          if (url && url.includes(s3Domain)) {
            const pathToDelete = decodeURIComponent(url.substring(url.indexOf(s3Domain) + s3Domain.length));
            await supabase.storage.from('banners').remove([pathToDelete]);
          } else if (url && url.includes(sbToken)) {
            const pathToDelete = decodeURIComponent(url.substring(url.indexOf(sbToken) + sbToken.length));
            await supabase.storage.from('banners').remove([pathToDelete]);
          }
        } catch (e) {
          console.warn("Storage deletion ignored:", e);
        }
      };

      if (imageUrl) await deleteStorageFile(imageUrl);
      if (mobileImageUrl) await deleteStorageFile(mobileImageUrl);

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
