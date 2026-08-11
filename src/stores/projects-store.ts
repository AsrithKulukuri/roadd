import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/project';

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

      // ─── Fetch (Supabase is source of truth) ──────────────────────────────
      fetchProjects: async () => {
        set({ isLoading: true, error: null });

        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('id', { ascending: false });

        if (error) {
          // Log full Supabase error details for debugging
          console.warn(
            'Projects fetch warning (keeping local state):',
            error.message ?? error.details ?? error.code ?? JSON.stringify(error)
          );
          // Keep existing local state — table may not exist yet
          set({ isLoading: false, error: error.message ?? 'Failed to fetch projects' });
          return;
        }

        // Supabase is source of truth — fully replace local state
        set({ projects: (data as Project[]) ?? [], isLoading: false });
      },

      // ─── Add ──────────────────────────────────────────────────────────────
      addProject: async (project: Project) => {
        // Optimistic update
        set((state) => ({
          projects: [project, ...state.projects.filter((p) => p.id !== project.id)],
        }));

        try {
          const { error } = await supabase.from('projects').insert([project]);
          if (error) {
            console.warn('Supabase project insert warning:', error.message);
          } else {
            // Re-fetch so we get the server's canonical version (correct JSONB, location, etc.)
            const { data } = await supabase
              .from('projects')
              .select('*')
              .order('id', { ascending: false });
            if (data) {
              const mappedData = data.map((p: any) => {
                if (!p.displayCategory) {
                  p.displayCategory = p.isFeatured ? "featured" : "none";
                }
                return p;
              });
              set({ projects: mappedData as Project[] });
            }
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
          const { error } = await supabase
            .from('projects')
            .update({ ...data, updatedAt: new Date().toISOString() })
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
            // Delete associated storage files
            const bucket = 'projects';
            const pathsToDelete: string[] = [];
            const extract = (url?: string | null) => {
              if (!url) return;
              const s3Domain = '.amazonaws.com/';
              const idx = url.indexOf(s3Domain);
              if (idx !== -1) {
                pathsToDelete.push(decodeURIComponent(url.substring(idx + s3Domain.length)));
              }
            };

            extract(project.coverImage);
            extract(project.builderLogoUrl);
            extract(project.videoUrl);
            extract(project.brochureUrl);
            project.images?.forEach((img) => extract(img.url));
            project.configurations?.forEach((cfg) => {
              extract(cfg.floorPlanUrl);
              extract(cfg.videoUrl);
              cfg.images?.forEach(extract);
            });

            if (pathsToDelete.length > 0) {
              const res = await fetch('/api/storage/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keys: pathsToDelete })
              });
              if (!res.ok) {
                console.warn('S3 storage project delete warning:', await res.text());
              }
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
