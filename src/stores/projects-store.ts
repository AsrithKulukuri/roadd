import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { deleteFromS3 } from '@/lib/aws/storage-utils';
import type { Project } from '@/types/project';

// Valid columns in Supabase projects table
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
  return {
    ...p,
    status: p.constructionStatus || p.status || 'under-construction',
    builder: {
      name: p.builderName || (p.builder?.name ?? 'Independent Developer'),
      logoUrl: p.builderLogoUrl || (p.builder?.logoUrl ?? null),
      phone: p.builderPhone || (p.builder?.phone ?? null),
      whatsapp: p.builderWhatsapp || (p.builder?.whatsapp ?? null),
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

      // ─── Fetch (Supabase is source of truth, but non-destructive) ──────────
      fetchProjects: async () => {
        set({ isLoading: true, error: null });

        try {
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('id', { ascending: false });

          if (error) {
            console.warn('Projects fetch warning (keeping local state):', error.message);
            set({ isLoading: false, error: error.message });
            return;
          }

          if (data && data.length > 0) {
            const mappedData = data.map(fromSupabaseProject);
            set({ projects: mappedData as Project[], isLoading: false });
          } else {
            // Non-destructive: if Supabase has 0 rows, check if local state has projects that need to be uploaded
            const currentLocal = get().projects;
            if (currentLocal && currentLocal.length > 0) {
              for (const item of currentLocal) {
                try {
                  const dbPayload = toSupabaseProject(item);
                  await supabase.from('projects').insert([dbPayload]);
                } catch (e) {
                  console.warn('Auto-sync project to Supabase notice:', e);
                }
              }
            }
            set({ isLoading: false });
          }
        } catch (err: any) {
          console.warn('Error fetching projects:', err);
          set({ isLoading: false, error: err?.message });
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
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          ),
        }));

        try {
          const dbPayload = toSupabaseProject(data as any);
          const { error } = await supabase
            .from('projects')
            .update({ ...dbPayload, updatedAt: new Date().toISOString() })
            .eq('id', id);
          if (error) console.warn('Supabase project update warning:', error.message);
        } catch (err: any) {
          console.warn('Supabase project update exception:', err?.message ?? err);
        }
      },

      // ─── Delete ───────────────────────────────────────────────────────────
      deleteProject: async (id: string) => {
        const project = get().projects.find((p) => p.id === id);

        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));

        try {
          const { error } = await supabase.from('projects').delete().eq('id', id);
          if (error) {
            console.warn('Supabase project delete warning:', error.message);
          } else if (project) {
            // Delete associated storage files from AWS S3
            const urlsToDelete: string[] = [];
            if (project.coverImage) urlsToDelete.push(project.coverImage);
            if (project.builderLogoUrl) urlsToDelete.push(project.builderLogoUrl);
            if (project.videoUrl) urlsToDelete.push(project.videoUrl);
            if (project.brochureUrl) urlsToDelete.push(project.brochureUrl);
            project.images?.forEach((img) => { if (img.url) urlsToDelete.push(img.url); });
            project.configurations?.forEach((cfg) => {
              if (cfg.floorPlanUrl) urlsToDelete.push(cfg.floorPlanUrl);
              if (cfg.videoUrl) urlsToDelete.push(cfg.videoUrl);
              cfg.images?.forEach((imgUrl) => { if (imgUrl) urlsToDelete.push(imgUrl); });
            });

            if (urlsToDelete.length > 0) {
              await deleteFromS3(urlsToDelete);
            }
          }
        } catch (err: any) {
          console.warn('Supabase project delete exception:', err?.message ?? err);
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
