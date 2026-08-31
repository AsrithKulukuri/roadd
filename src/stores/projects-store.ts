import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { deleteFromS3 } from '@/lib/aws/storage-utils';
import type { Project } from '@/types/project';
import { toast } from 'sonner';

// Valid columns in Supabase projects table (matching actual database schema)
const VALID_PROJECT_COLUMNS = new Set([
  'id', 'slug', 'name', 'tagline', 'description', 'projectType',
  'builderName', 'builderLogoUrl', 'builderPhone', 'builderWhatsapp',
  'location', 'reraId', 'reraApproved', 'noBrokerage',
  'constructionStatus', 'totalUnits', 'totalArea', 'phases',
  'configurations', 'images', 'coverImage', 'videoUrl',
  'brochureUrl', 'highlights', 'facilities', 'isFeatured',
  'isPublished', 'viewCount', 'createdAt', 'updatedAt',
  'crdaApproved', 'totalTowers', 'constructionUpdates', 'displayCategory'
]);

// Public projection columns excluding private builder contact numbers
const PUBLIC_PROJECT_SELECT = [
  'id', 'slug', 'name', 'tagline', 'description', 'projectType',
  'builderName', 'builderLogoUrl',
  'location', 'reraId', 'reraApproved', 'noBrokerage',
  'constructionStatus', 'totalUnits', 'totalArea', 'phases',
  'configurations', 'images', 'coverImage', 'videoUrl',
  'brochureUrl', 'highlights', 'facilities', 'isFeatured',
  'isPublished', 'viewCount', 'createdAt', 'updatedAt',
  'crdaApproved', 'totalTowers', 'constructionUpdates', 'displayCategory'
].join(',');

export function toSupabaseProject(proj: Partial<Project>): any {
  const p: any = { ...proj };
  
  if (p.builder) {
    p.builderName = p.builder.name || p.builderName || 'Independent Developer';
    p.builderLogoUrl = p.builder.logoUrl || p.builderLogoUrl || null;
    p.builderPhone = p.builder.phone || p.builderPhone || null;
    p.builderWhatsapp = p.builder.whatsapp || p.builderWhatsapp || null;
    delete p.builder;
  }
  if (!p.builderName) p.builderName = 'Independent Developer';

  if (p.status && !p.constructionStatus) {
    p.constructionStatus = p.status;
  }
  delete p.status;

  if (p.videoUrl !== undefined) {
    p.videoUrl = p.videoUrl ? p.videoUrl.trim() : null;
  }
  if (p.coverImage !== undefined) {
    p.coverImage = p.coverImage ? p.coverImage.trim() : null;
  }
  if (p.masterPlanUrl !== undefined) {
    p.masterPlanUrl = p.masterPlanUrl ? p.masterPlanUrl.trim() : null;
  }

  // Guaranteed persistence: embed master plan in images JSONB array so it is saved in Supabase without requiring table migration
  if (p.masterPlanUrl) {
    const existingImages = Array.isArray(p.images) ? [...p.images] : [];
    const masterPlanIdx = existingImages.findIndex((img: any) => (typeof img === 'object' && (img.category === 'master-plan' || img.isMasterPlan)));
    const masterPlanItem = {
      url: p.masterPlanUrl,
      alt: 'Master Plan',
      category: 'master-plan',
      isMasterPlan: true
    };
    if (masterPlanIdx >= 0) {
      existingImages[masterPlanIdx] = masterPlanItem;
    } else {
      existingImages.push(masterPlanItem);
    }
    p.images = existingImages;
  } else if (p.masterPlanUrl === null && Array.isArray(p.images)) {
    p.images = p.images.filter((img: any) => !(typeof img === 'object' && (img.category === 'master-plan' || img.isMasterPlan)));
  }

  if (!p.createdAt) p.createdAt = new Date().toISOString();
  if (!p.updatedAt) p.updatedAt = new Date().toISOString();

  // Strip keys that are not valid columns in Supabase
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(p)) {
    if (VALID_PROJECT_COLUMNS.has(key)) {
      cleaned[key] = p[key];
    }
  }
  return cleaned;
}

export function fromSupabaseProject(p: any): Project {
  // Sanitize any expired temporary blob: URLs that were accidentally saved
  const brochureUrl = p.brochureUrl && !p.brochureUrl.startsWith('blob:') ? p.brochureUrl : undefined;
  const coverImage = p.coverImage && !p.coverImage.startsWith('blob:') ? p.coverImage : (p.cover_image && !p.cover_image.startsWith('blob:') ? p.cover_image : undefined);
  const videoUrl = p.videoUrl && !p.videoUrl.startsWith('blob:') ? p.videoUrl : (p.video_url && !p.video_url.startsWith('blob:') ? p.video_url : undefined);
  
  // Reconstruct masterPlanUrl from column, snake_case, or embedded images JSONB
  const masterPlanFromImages = Array.isArray(p.images) 
    ? p.images.find((img: any) => typeof img === 'object' && (img.category === 'master-plan' || img.isMasterPlan))?.url 
    : undefined;
  const rawMasterPlan = p.masterPlanUrl || p.master_plan_url || masterPlanFromImages;
  const masterPlanUrl = rawMasterPlan && !rawMasterPlan.startsWith('blob:') ? rawMasterPlan : undefined;

  const cleanObj = { ...p };
  delete cleanObj.builderPhone;
  delete cleanObj.builderWhatsapp;
  delete cleanObj.builder_phone;
  delete cleanObj.builder_whatsapp;

  return {
    ...cleanObj,
    refId: p.refId || (p.id ? `REF${(p.id.replace(/\D/g, "") || "100").padStart(3, "0").slice(0, 5)}` : undefined),
    brochureUrl,
    coverImage,
    videoUrl,
    masterPlanUrl,
    status: p.constructionStatus || p.status || 'under-construction',
    builder: {
      name: p.builderName || (p.builder?.name ?? 'Independent Developer'),
      logoUrl: p.builderLogoUrl || (p.builder?.logoUrl ?? null),
      phone: null,
      whatsapp: null,
    },
    displayCategory: p.displayCategory || (p.isFeatured ? "featured" : "none")
  };
}

interface ProjectsState {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  updateRefId: (id: string, refId: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  toggleFeatured: (id: string) => Promise<void>;
  updateDisplayCategory: (id: string, category: "featured" | "recommended" | "budget_friendly" | "none") => Promise<void>;
  togglePublished: (id: string) => Promise<void>;
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: [],
      isLoading: false,
      error: null,

      // ─── Fetch (Supabase is source of truth) ─────────────────────────────
      fetchProjects: async () => {
        set({ isLoading: true, error: null });

        try {
          const fetchPromise = supabase
            .from('projects')
            .select(PUBLIC_PROJECT_SELECT)
            .order('id', { ascending: false });

          const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out. Please check your connection and retry.')), 10000)
          );

          const { data, error } = (await Promise.race([fetchPromise, timeoutPromise])) as any;

          if (error) {
            console.warn('Projects fetch warning (keeping local state):', error.message);
            set({ isLoading: false, error: error.message });
            return;
          }

          const mappedData = (data || []).map(fromSupabaseProject);
          set({ projects: mappedData as Project[], isLoading: false, error: null });
        } catch (err: any) {
          console.warn('Error fetching projects:', err);
          set({ isLoading: false, error: err?.message || 'Failed to load projects' });
        }
      },

      // ─── Add ──────────────────────────────────────────────────────────────
      addProject: async (project: Project) => {
        // 1. Optimistic update in Zustand & localStorage
        set((state) => ({
          projects: [project, ...state.projects.filter((p) => p.id !== project.id)],
        }));

        try {
          // 2. Prepare cleaned payload for Supabase
          const dbPayload = toSupabaseProject(project);
          const { error } = await supabase
            .from('projects')
            .insert([dbPayload]);

          if (error) {
            console.warn('Supabase project insert warning:', error.message);
          }
        } catch (err: any) {
          console.warn('Supabase project insert exception:', err?.message ?? err);
        }
      },

      // ─── Update ───────────────────────────────────────────────────────────
      updateProject: async (id: string, data: Partial<Project>) => {
        const cleanData = { ...data };
        if (cleanData.videoUrl === "") cleanData.videoUrl = null as any;

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id || (p.slug && cleanData.slug && p.slug === cleanData.slug)
              ? { ...p, ...cleanData, updatedAt: new Date().toISOString() }
              : p
          ),
        }));

        try {
          const dbPayload = toSupabaseProject(cleanData as any);
          let { error } = await supabase
            .from('projects')
            .update({ ...dbPayload, updatedAt: new Date().toISOString() })
            .eq('id', id);

          if (error && cleanData.slug) {
            const fallbackRes = await supabase
              .from('projects')
              .update({ ...dbPayload, updatedAt: new Date().toISOString() })
              .eq('slug', cleanData.slug);
            error = fallbackRes.error;
          }

          if (error) {
            console.error('Supabase project update warning:', error.message);
          } else {
            // Refresh store from Supabase
            await get().fetchProjects();
          }
        } catch (err: any) {
          console.error('Supabase project update exception:', err?.message ?? err);
        }
      },

      // ─── Delete ───────────────────────────────────────────────────────────
      deleteProject: async (id: string) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));

        try {
          const res = await fetch('/api/projects/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });

          if (!res.ok) {
            await supabase.from('projects').delete().eq('id', id);
          }

          toast.success('Project permanently deleted from database');
        } catch (err: any) {
          console.warn('Project delete exception:', err?.message ?? err);
          try {
            await supabase.from('projects').delete().eq('id', id);
          } catch {}
        }
      },

      // ─── Toggle Featured ──────────────────────────────────────────────────
      toggleFeatured: async (id: string) => {
        const project = get().projects.find((p) => p.id === id);
        if (!project) return;
        const newVal = !project.isFeatured;

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, isFeatured: newVal } : p
          ),
        }));

        try {
          const { error } = await supabase
            .from('projects')
            .update({ isFeatured: newVal })
            .eq('id', id);
          if (error) console.warn('Supabase toggleFeatured warning:', error.message);
        } catch (err: any) {
          console.warn('Supabase toggleFeatured exception:', err?.message ?? err);
        }
      },

      updateDisplayCategory: async (id: string, category: "featured" | "recommended" | "budget_friendly" | "none") => {
        const project = get().projects.find((p) => p.id === id);
        if (!project) return;

        const isFeatured = category === "featured";

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  isFeatured,
                  displayCategory: category,
                }
              : p
          ),
        }));

        try {
          const { error } = await supabase
            .from('projects')
            .update({
              isFeatured,
              displayCategory: category,
            })
            .eq('id', id);

          if (error) console.warn('Supabase updateDisplayCategory warning:', error.message);
        } catch (error: any) {
          console.warn('Supabase updateDisplayCategory exception:', error);
        }
      },

      // ─── Update Ref ID ────────────────────────────────────────────────────
      updateRefId: async (id: string, refId: string) => {
        const cleanRef = refId.trim().toUpperCase();
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, refId: cleanRef, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      // ─── Toggle Published ─────────────────────────────────────────────────
      togglePublished: async (id: string) => {
        const project = get().projects.find((p) => p.id === id);
        if (!project) return;
        const newVal = !project.isPublished;

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, isPublished: newVal } : p
          ),
        }));

        try {
          const { error } = await supabase
            .from('projects')
            .update({ isPublished: newVal })
            .eq('id', id);
          if (error) console.warn('Supabase togglePublished warning:', error.message);
        } catch (err: any) {
          console.warn('Supabase togglePublished exception:', err?.message ?? err);
        }
      },
    }),
    {
      name: 'road_projects_store',
      partialize: (state) => ({ projects: state.projects }),
    }
  )
);
