import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export interface Banner {
  id: string;
  image_url: string;
  title: string | null;
  link_url: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

interface BannersStore {
  banners: Banner[];
  isLoading: boolean;
  fetchBanners: (includeInactive?: boolean) => Promise<void>;
  addBanner: (banner: Omit<Banner, "id" | "created_at">, file: File) => Promise<boolean>;
  updateBanner: (id: string, updates: Partial<Banner>, file?: File) => Promise<boolean>;
  deleteBanner: (id: string, imageUrl: string) => Promise<boolean>;
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

  addBanner: async (bannerData, file) => {
    set({ isLoading: true });
    try {
      const ext = file.name.split('.').pop();
      const path = `banners/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('banners')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: pubData } = supabase.storage.from('banners').getPublicUrl(uploadData.path);
      const imageUrl = pubData.publicUrl;

      const { error: insertError } = await supabase.from("banners").insert({
        ...bannerData,
        image_url: imageUrl,
      });

      if (insertError) throw insertError;
      
      await get().fetchBanners(true);
      return true;
    } catch (error) {
      console.error("Failed to add banner:", error);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  updateBanner: async (id, updates, file) => {
    set({ isLoading: true });
    try {
      let imageUrl = updates.image_url;

      if (file) {
        const ext = file.name.split('.').pop();
        const path = `banners/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('banners')
          .upload(path, file);

        if (uploadError) throw uploadError;
        const { data: pubData } = supabase.storage.from('banners').getPublicUrl(uploadData.path);
        imageUrl = pubData.publicUrl;
      }

      const { error } = await supabase.from("banners").update({ ...updates, image_url: imageUrl }).eq("id", id);
      if (error) throw error;

      await get().fetchBanners(true);
      return true;
    } catch (error) {
      console.error("Failed to update banner:", error);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteBanner: async (id, imageUrl) => {
    set({ isLoading: true });
    try {
      const s3Domain = '.amazonaws.com/';
      const sbToken = '/public/banners/';
      let pathToDelete = null;

      if (imageUrl && imageUrl.includes(s3Domain)) {
         pathToDelete = decodeURIComponent(imageUrl.substring(imageUrl.indexOf(s3Domain) + s3Domain.length));
      } else if (imageUrl && imageUrl.includes(sbToken)) {
         pathToDelete = decodeURIComponent(imageUrl.substring(imageUrl.indexOf(sbToken) + sbToken.length));
         await supabase.storage.from('banners').remove([pathToDelete]);
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
