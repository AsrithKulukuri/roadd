import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
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

export function toSupabaseProject(proj: Partial<Project>): Record<string, unknown> {
  const p: Record<string, unknown> = { ...proj };
  
  if (p.builder && typeof p.builder === 'object') {
    const b = p.builder as { name?: string; logoUrl?: string | null; phone?: string | null; whatsapp?: string | null };
    p.builderName = b.name || p.builderName || 'Independent Developer';
    p.builderLogoUrl = b.logoUrl || p.builderLogoUrl || null;
    p.builderPhone = b.phone || p.builderPhone || null;
    p.builderWhatsapp = b.whatsapp || p.builderWhatsapp || null;
    delete p.builder;
  }
  if (!p.builderName) p.builderName = 'Independent Developer';

  if (p.status && !p.constructionStatus) {
    p.constructionStatus = p.status;
  }
  delete p.status;

  if (p.videoUrl !== undefined) {
    p.videoUrl = typeof p.videoUrl === 'string' ? p.videoUrl.trim() : null;
  }
  if (p.coverImage !== undefined) {
    p.coverImage = typeof p.coverImage === 'string' ? p.coverImage.trim() : null;
  }
  if (p.masterPlanUrl !== undefined) {
    p.masterPlanUrl = typeof p.masterPlanUrl === 'string' ? p.masterPlanUrl.trim() : null;
  }

  // Guaranteed persistence: embed master plan in images JSONB array so it is saved in Supabase without requiring table migration
  if (p.masterPlanUrl) {
    const existingImages = Array.isArray(p.images) ? [...p.images] : [];
    const masterPlanIdx = existingImages.findIndex((img: unknown) => (typeof img === 'object' && img !== null && ((img as Record<string, unknown>).category === 'master-plan' || (img as Record<string, unknown>).isMasterPlan)));
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
    p.images = p.images.filter((img: unknown) => !(typeof img === 'object' && img !== null && ((img as Record<string, unknown>).category === 'master-plan' || (img as Record<string, unknown>).isMasterPlan)));
  }

  if (!p.createdAt) p.createdAt = new Date().toISOString();
  if (!p.updatedAt) p.updatedAt = new Date().toISOString();

  // Strip keys that are not valid columns in Supabase
  const cleaned: Record<string, unknown> = {};
  for (const key of Object.keys(p)) {
    if (VALID_PROJECT_COLUMNS.has(key)) {
      cleaned[key] = p[key];
    }
  }
  return cleaned;
}

export function fromSupabaseProject(p: Record<string, unknown>): Project {
  // Sanitize any expired temporary blob: URLs that were accidentally saved
  const rawBrochure = typeof p.brochureUrl === 'string' ? p.brochureUrl : undefined;
  const brochureUrl = rawBrochure && !rawBrochure.startsWith('blob:') ? rawBrochure : undefined;
  
  const rawCover = (typeof p.coverImage === 'string' ? p.coverImage : (typeof p.cover_image === 'string' ? p.cover_image : undefined));
  const coverImage = rawCover && !rawCover.startsWith('blob:') ? rawCover : undefined;
  
  const rawVideo = (typeof p.videoUrl === 'string' ? p.videoUrl : (typeof p.video_url === 'string' ? p.video_url : undefined));
  const videoUrl = rawVideo && !rawVideo.startsWith('blob:') ? rawVideo : undefined;
  
  // Reconstruct masterPlanUrl from column, snake_case, or embedded images JSONB
  const masterPlanFromImages = Array.isArray(p.images) 
    ? (p.images.find((img: unknown) => typeof img === 'object' && img !== null && ((img as Record<string, unknown>).category === 'master-plan' || (img as Record<string, unknown>).isMasterPlan)) as { url?: string } | undefined)?.url 
    : undefined;
  const rawMasterPlan = (typeof p.masterPlanUrl === 'string' ? p.masterPlanUrl : (typeof p.master_plan_url === 'string' ? p.master_plan_url : masterPlanFromImages));
  const masterPlanUrl = rawMasterPlan && !rawMasterPlan.startsWith('blob:') ? rawMasterPlan : undefined;

  const cleanObj = { ...p };
  delete cleanObj.builderPhone;
  delete cleanObj.builderWhatsapp;
  delete cleanObj.builder_phone;
  delete cleanObj.builder_whatsapp;

  const rawId = typeof p.id === 'string' ? p.id : '';
  const refId = typeof p.refId === 'string' ? p.refId : (rawId ? `REF${(rawId.replace(/\D/g, "") || "100").padStart(3, "0").slice(0, 5)}` : undefined);
  const builderObj = p.builder as { name?: string; logoUrl?: string | null } | undefined;

  return {
    ...(cleanObj as unknown as Project),
    refId,
    brochureUrl,
    coverImage,
    videoUrl,
    masterPlanUrl,
    constructionStatus: (p.constructionStatus as "under-construction" | "ready-to-move" | "new-launch" | undefined) || 'under-construction',
    builderName: (typeof p.builderName === 'string' ? p.builderName : (builderObj?.name ?? 'Independent Developer')),
    builderLogoUrl: (typeof p.builderLogoUrl === 'string' ? p.builderLogoUrl : (builderObj?.logoUrl ?? undefined)),
    builderPhone: undefined,
    builderWhatsapp: undefined,
    displayCategory: (p.displayCategory as "featured" | "recommended" | "budget_friendly" | "none" | undefined) || (p.isFeatured ? "featured" : "none")
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

let activeProjectsRequestId = 0;
let inFlightProjectsPromise: Promise<void> | null = null;
let projectsAbortController: AbortController | null = null;

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: [],
      isLoading: false,
      error: null,

      // ─── Fetch (Supabase is source of truth) ─────────────────────────────
      fetchProjects: async () => {
        if (inFlightProjectsPromise) {
          return inFlightProjectsPromise;
        }

        if (projectsAbortController) {
          projectsAbortController.abort();
        }
        projectsAbortController = new AbortController();
        const currentSignal = projectsAbortController.signal;
        const currentRequestId = ++activeProjectsRequestId;

        set({ isLoading: true, error: null });

        inFlightProjectsPromise = (async () => {
          let timeoutId: NodeJS.Timeout | null = null;
          try {
            const timeoutPromise = new Promise<never>((_, reject) => {
              timeoutId = setTimeout(() => {
                projectsAbortController?.abort();
                reject(new Error("Request timed out. Please check your connection and retry."));
              }, 9000);
            });

            const queryPromise = supabase
              .from('projects')
              .select(PUBLIC_PROJECT_SELECT)
              .order('id', { ascending: false })
              .abortSignal(currentSignal);

            const result = await Promise.race([queryPromise, timeoutPromise]);

            if (currentSignal.aborted || currentRequestId !== activeProjectsRequestId) return;

            const { data, error } = result as { data: Record<string, unknown>[] | null; error: { message: string } | null };

            if (error) {
              console.warn('Projects fetch warning (keeping local state):', error.message);
              set({ error: error.message });
              return;
            }

            const mappedData = (data || []).map(fromSupabaseProject);
            set({ projects: mappedData, error: null });
          } catch (err: unknown) {
            const isAbort = currentSignal.aborted || (err instanceof Error && (err.name === 'AbortError' || err.message.toLowerCase().includes('abort')));
            if (isAbort || currentRequestId !== activeProjectsRequestId) {
              return;
            }
            const message = err instanceof Error ? err.message : "Failed to load projects";
            console.warn('Error fetching projects:', message);
            set({ error: message });
          } finally {
            if (timeoutId) clearTimeout(timeoutId);
            if (currentRequestId === activeProjectsRequestId) {
              inFlightProjectsPromise = null;
              set({ isLoading: false });
            }
          }
        })();

        return inFlightProjectsPromise;
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
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn('Supabase project insert exception:', message);
        }
      },

      // ─── Update ───────────────────────────────────────────────────────────
      updateProject: async (id: string, data: Partial<Project>) => {
        const cleanData = { ...data };
        if (cleanData.videoUrl === "") cleanData.videoUrl = undefined;

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id || (p.slug && cleanData.slug && p.slug === cleanData.slug)
              ? { ...p, ...cleanData, updatedAt: new Date().toISOString() }
              : p
          ),
        }));

        try {
          const dbPayload = toSupabaseProject(cleanData);
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
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error('Supabase project update exception:', message);
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
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn('Project delete exception:', message);
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
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn('Supabase toggleFeatured exception:', message);
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
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn('Supabase updateDisplayCategory exception:', message);
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
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn('Supabase togglePublished exception:', message);
        }
      },
    }),
    {
      name: 'road_projects_store',
      partialize: (state) => ({ projects: state.projects }),
    }
  )
);
