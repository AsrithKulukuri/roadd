import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { useProjectsStore, fromSupabaseProject } from "@/stores/projects-store";
import { useSchedulesStore } from "@/stores/schedules-store";
import { toast } from "sonner";

export interface BuilderProfile {
  id: string;
  userId?: string;
  companyName: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
  tagline?: string;
  reraNumber?: string;
  crdaApproved?: boolean;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber?: string;
  officeAddress?: string;
  experienceYears?: number;
  tier: "starter" | "premium" | "titan";
  isVerified: boolean;
  assignedProjectIds: string[];
  assignedPropertyIds: string[];
  chatEnabled: boolean;
  promotedAtTop: boolean;
  bannerActive: boolean;
  lastLoginAt?: string;
  lastActiveAt?: string;
  loginCredentialsHint?: string; // e.g. "builder@demo.com / road2026"
  createdAt: string;
  updatedAt: string;
}

export interface BuilderActivityLog {
  id: string;
  builderId: string;
  builderName: string;
  actionType: "login" | "logout" | "view_analytics" | "edit_project" | "update_schedule" | "submit_request" | "chat_message";
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  deviceInfo?: string;
  createdAt: string;
}

export interface BuilderRequest {
  id: string;
  builderId: string;
  builderName: string;
  requestType: "promote_top" | "publish_banner" | "enable_chat" | "caption_change" | "custom_concierge";
  projectId?: string;
  projectName?: string;
  title: string;
  details: {
    verification?: import("zod").infer<typeof import("@/lib/builder-validation").verificationEvidenceSchema>;
    proposedCaption?: string;
    proposedBannerUrl?: string;
    shelfId?: string;
    durationDays?: number;
    notes?: string;
    targetUrl?: string;
  };
  status: "pending" | "under_review" | "approved" | "rejected" | "active" | "completed";
  adminNotes?: string;
  priority: "low" | "normal" | "urgent";
  createdAt: string;
  updatedAt: string;
}

export interface BuilderMessage {
  id: string;
  builderId: string;
  requestId?: string;
  senderRole: "builder" | "admin";
  senderName: string;
  message: string;
  attachments?: string[];
  isRead: boolean;
  createdAt: string;
}

// Initial demo seed builders for instant out-of-the-box functioning
export interface BuilderContactLead {
  id: string; builderId: string; projectId: string; projectName: string;
  buyerName: string; buyerPhone: string; buyerEmail?: string; buyerLocation: string;
  unitInterested?: string; budget?: string;
  inquiryType: "whatsapp_chat" | "phone_reveal" | "brochure_download" | "site_visit" | "inquiry_form";
  notes?: string; status: "new" | "contacted" | "scheduled" | "closed"; createdAt: string;
}
interface BuilderStoreState {
  builders: BuilderProfile[];
  currentBuilderId: string | null;
  requests: BuilderRequest[];
  activityLogs: BuilderActivityLog[];
  messages: BuilderMessage[];
  contactLeads: BuilderContactLead[];
  isLoading: boolean;

  // Builder actions
  setCurrentBuilderId: (id: string | null) => void;
  logoutBuilder: () => Promise<void>;
  getCurrentBuilder: () => BuilderProfile | null;
  saveBuilderProfile: (profile: Partial<BuilderProfile> & { id: string; companyName: string }) => Promise<void>;
  deleteBuilderProfile: (id: string) => Promise<void>;
  assignProjectsToBuilder: (builderId: string, projectIds: string[], propertyIds?: string[]) => Promise<void>;
  
  // Guarded content update: explicitly blocks modification of caption/tagline or title
  updateProjectContentGuarded: (
    projectId: string, 
    builderId: string,
    allowedPayload: {
      description?: string;
      highlights?: string[];
      facilities?: string[];
      constructionStatus?: string;
      constructionUpdates?: any[];
      pricingNotes?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;

  // Requests
  submitRequest: (request: Omit<BuilderRequest, "id" | "createdAt" | "updatedAt" | "status">) => Promise<BuilderRequest>;
  updateRequestStatus: (requestId: string, status: BuilderRequest["status"], adminNotes?: string, confirmVerified?: boolean) => Promise<void>;
  
  // Chat
  sendMessage: (msg: Omit<BuilderMessage, "id" | "createdAt" | "isRead">) => Promise<BuilderMessage>;
  markMessagesRead: (builderId: string) => Promise<void>;

  // Audit Logs
  logActivity: (
    builderId: string, 
    actionType: BuilderActivityLog["actionType"], 
    details?: Record<string, any>,
    entityId?: string,
    entityName?: string
  ) => Promise<void>;

  // Leads & Contact Reveal actions
  updateLeadStatus: (leadId: string, status: BuilderContactLead["status"]) => void;
  addContactLead: (lead: Omit<BuilderContactLead, "id" | "createdAt">) => void;

  // Real-time sync helpers
  fetchFromSupabase: () => Promise<void>;
}

async function portalFetch(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, { method, cache: "no-store", headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || "Portal request failed. Please retry.");
  return data;
}
export const useBuilderStore = create<BuilderStoreState>()(
  persist((set, get) => ({
    builders: [], currentBuilderId: null, requests: [], activityLogs: [], messages: [], contactLeads: [], isLoading: false,
    setCurrentBuilderId: (id) => set({ currentBuilderId: id }),
    getCurrentBuilder: () => get().builders.find(b => b.id === get().currentBuilderId) || null,
    logoutBuilder: async () => {
      await portalFetch("/api/auth/logout", "POST");
      await supabase.auth.signOut({ scope: "local" });
      set({ builders: [], currentBuilderId: null, requests: [], activityLogs: [], messages: [], contactLeads: [] });
      useSchedulesStore.setState({ schedules: [] });
      useProjectsStore.setState({ projects: [] });
      for (const key of ["road_builder_user", "road_user", "road-builder-store", "road_schedules_storage"]) localStorage.removeItem(key);
      window.dispatchEvent(new CustomEvent("road_auth_changed"));
    },
    saveBuilderProfile: async (profile) => {
      const existing = get().builders.find(b => b.id === profile.id);
      const data = await portalFetch("/api/admin/builders", "POST", { ...existing, ...profile });
      set(state => ({ builders: [data.builder, ...state.builders.filter(b => b.id !== profile.id && b.id !== data.builder.id)] }));
    },
    deleteBuilderProfile: async (id) => {
      await portalFetch("/api/admin/builders?id=" + encodeURIComponent(id), "DELETE");
      set(state => ({ builders: state.builders.filter(b => b.id !== id) }));
    },
    assignProjectsToBuilder: async (id, projectIds, propertyIds = []) => {
      const builder = get().builders.find(b => b.id === id);
      if (!builder) throw new Error("Builder not found.");
      await get().saveBuilderProfile({ ...builder, assignedProjectIds: projectIds, assignedPropertyIds: propertyIds });
    },
    updateProjectContentGuarded: async (projectId, _builderId, payload) => {
      try {
        const data = await portalFetch("/api/builder/projects", "PATCH", { projectId, payload });
        const project = fromSupabaseProject(data.project);
        useProjectsStore.setState(state => ({ projects: state.projects.map(p => p.id === project.id ? project : p) }));
        return { success: true };
      } catch (error) { return { success: false, error: error instanceof Error ? error.message : "Save failed." }; }
    },
    submitRequest: async (request) => {
      const data = await portalFetch("/api/builder/requests", "POST", request);
      set(state => ({ requests: [data.request, ...state.requests] }));
      return data.request;
    },
    updateRequestStatus: async (id, status, adminNotes, confirmVerified) => {
      const data = await portalFetch("/api/builder/requests", "PATCH", { id, status, adminNotes, confirmVerified });
      set(state => ({ requests: state.requests.map(r => r.id === id ? data.request : r) }));
    },
    sendMessage: async (message) => {
      const data = await portalFetch("/api/builder/chat", "POST", message);
      set(state => ({ messages: [...state.messages.filter(m => m.id !== data.message.id), data.message] }));
      return data.message;
    },
    markMessagesRead: async (builderId) => {
      const data = await portalFetch("/api/builder/chat", "PATCH", { builderId });
      set(state => ({ messages: state.messages.map(m => m.builderId === builderId && m.senderRole === data.senderRole ? { ...m, isRead: true } : m) }));
    },
    logActivity: async () => { /* Authoritative audit events are recorded by the server. */ },
    updateLeadStatus: () => { toast.error("Lead status editing is not available for this report."); },
    addContactLead: () => { /* Leads are created by the authenticated project lead API. */ },
    fetchFromSupabase: async () => {
      set({ isLoading: true });
      try {
        const data = await portalFetch("/api/builder/session");
        set({ builders: data.builders, currentBuilderId: data.currentBuilderId, requests: data.requests, messages: data.messages, activityLogs: data.activityLogs || [] });
        if (data.currentBuilderId) useProjectsStore.setState({ projects: data.projects.map(fromSupabaseProject) });
      } catch (error) {
        set({ builders: [], currentBuilderId: null, requests: [], messages: [], activityLogs: [], contactLeads: [] });
        throw error;
      } finally { set({ isLoading: false }); }
    },
  }), { name: "road-builder-store", version: 2, partialize: () => ({}), migrate: () => ({}), merge: (_stored, current) => current })
);
