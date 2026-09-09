import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
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
export const INITIAL_BUILDERS: BuilderProfile[] = [
  {
    id: "bld-aditya-01",
    companyName: "Sri Aditya Homes & Ventures",
    slug: "sri-aditya-homes",
    logoUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=300&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
    description: "Premier luxury residential and commercial developer in Amaravati and Vijayawada with over 20+ landmark gated communities.",
    tagline: "Crafting Architectural Landmarks of Tomorrow",
    reraNumber: "P06180020199",
    crdaApproved: true,
    contactEmail: "director@sriadityahomes.com",
    contactPhone: "+91 98490 12345",
    whatsappNumber: "+91 98490 12345",
    officeAddress: "Level 4, Aditya Gateway, MG Road, Vijayawada, AP",
    experienceYears: 18,
    tier: "titan",
    isVerified: true,
    assignedProjectIds: ["amaravati-heights", "road-skyline-towers", "proj-amaravati-heights"],
    assignedPropertyIds: [],
    chatEnabled: true,
    promotedAtTop: true,
    bannerActive: true,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    loginCredentialsHint: "director@sriadityahomes.com / road2026",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bld-jayabheri-02",
    companyName: "Jayabheri Properties & Estates",
    slug: "jayabheri-properties",
    logoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80",
    description: "Pioneering sustainable and road-exclusive high-rise developments across the AP Capital Region.",
    tagline: "Excellence in Every Square Foot",
    reraNumber: "P06180020255",
    crdaApproved: true,
    contactEmail: "sales@jayabherigroup.com",
    contactPhone: "+91 99887 76655",
    whatsappNumber: "+91 99887 76655",
    officeAddress: "Jayabheri Silicon Towers, Benz Circle, Vijayawada, AP",
    experienceYears: 24,
    tier: "premium",
    isVerified: true,
    assignedProjectIds: ["green-valley-villas", "proj-green-valley"],
    assignedPropertyIds: [],
    chatEnabled: true,
    promotedAtTop: false,
    bannerActive: false,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    loginCredentialsHint: "sales@jayabherigroup.com / road2026",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const INITIAL_REQUESTS: BuilderRequest[] = [
  {
    id: "req-01",
    builderId: "bld-aditya-01",
    builderName: "Sri Aditya Homes & Ventures",
    requestType: "publish_banner",
    projectId: "amaravati-heights",
    projectName: "Amaravati Heights Luxury Towers",
    title: "Request Hero Banner placement for Amaravati Heights Launch",
    details: {
      proposedCaption: "Amaravati's Most Anticipated Road-Facing Luxury Community — Open for Early Expressions of Interest",
      proposedBannerUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=80",
      durationDays: 14,
      notes: "Seeking prime homepage hero carousel placement for 2 weeks during Ugadi festive launch."
    },
    status: "approved",
    adminNotes: "Approved by Admin. Scheduled to run on Homepage Hero Slot 1.",
    priority: "urgent",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "req-02",
    builderId: "bld-jayabheri-02",
    builderName: "Jayabheri Properties & Estates",
    requestType: "promote_top",
    projectId: "green-valley-villas",
    projectName: "Green Valley Luxury Villas",
    title: "Promote Green Valley to Top of 'Verified Luxury Villas' Shelf",
    details: {
      shelfId: "shelf-luxury-villas",
      durationDays: 30,
      notes: "We have 4 corner road-facing units newly released. Requesting top placement on the homepage villas shelf."
    },
    status: "pending",
    adminNotes: "Reviewing slot availability for next weekend.",
    priority: "normal",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  }
];

export const INITIAL_LOGS: BuilderActivityLog[] = [
  {
    id: "log-01",
    builderId: "bld-aditya-01",
    builderName: "Sri Aditya Homes & Ventures",
    actionType: "login",
    details: { browser: "Chrome / Windows 11", location: "Vijayawada, AP" },
    ipAddress: "49.207.214.88",
    deviceInfo: "Chrome 122.0 / Windows NT 10.0",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "log-02",
    builderId: "bld-aditya-01",
    builderName: "Sri Aditya Homes & Ventures",
    actionType: "edit_project",
    entityId: "amaravati-heights",
    entityName: "Amaravati Heights",
    details: { updatedFields: ["constructionStatus", "description", "milestones"] },
    ipAddress: "49.207.214.88",
    createdAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
  },
  {
    id: "log-03",
    builderId: "bld-jayabheri-02",
    builderName: "Jayabheri Properties & Estates",
    actionType: "submit_request",
    entityId: "req-02",
    entityName: "Promote Green Valley",
    details: { type: "promote_top", shelf: "shelf-luxury-villas" },
    ipAddress: "157.48.19.102",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  }
];

export const INITIAL_MESSAGES: BuilderMessage[] = [
  {
    id: "msg-01",
    builderId: "bld-aditya-01",
    requestId: "req-01",
    senderRole: "builder",
    senderName: "Director (Sri Aditya Homes)",
    message: "Hello ROAD Admin Team, we have submitted our high-res 4K drone banner for Amaravati Heights. Please review and activate!",
    attachments: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=80"],
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
  {
    id: "msg-02",
    builderId: "bld-aditya-01",
    requestId: "req-01",
    senderRole: "admin",
    senderName: "ROAD Curation Team",
    message: "Great quality creative! The banner is approved and scheduled to go live at 12:00 PM tomorrow. Best of luck with the launch.",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  }
];

export interface BuilderContactLead {
  id: string;
  builderId: string;
  projectId: string;
  projectName: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  buyerLocation: string;
  unitInterested?: string;
  budget?: string;
  inquiryType: "whatsapp_chat" | "phone_reveal" | "brochure_download" | "site_visit" | "inquiry_form";
  notes?: string;
  status: "new" | "contacted" | "scheduled" | "closed";
  createdAt: string;
}

export const INITIAL_CONTACT_LEADS: BuilderContactLead[] = [
  {
    id: "lead-01",
    builderId: "bld-aditya-01",
    projectId: "amaravati-heights",
    projectName: "Amaravati Heights Luxury Towers",
    buyerName: "K. Venkat Rao",
    buyerPhone: "+91 98490 88712",
    buyerEmail: "venkat.rao.nri@gmail.com",
    buyerLocation: "Dallas, TX (NRI - Roots in Vijayawada)",
    unitInterested: "Tower A - 3 BHK Premium East Facing (2,450 sq.ft)",
    budget: "₹2.2 Cr",
    inquiryType: "whatsapp_chat",
    notes: "Clicked WhatsApp inquiry from Amaravati Heights detail page. Interested in top floor with river view.",
    status: "new",
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: "lead-02",
    builderId: "bld-aditya-01",
    projectId: "amaravati-heights",
    projectName: "Amaravati Heights Luxury Towers",
    buyerName: "Dr. S. Madhavi",
    buyerPhone: "+91 94401 23987",
    buyerEmail: "madhavi.ortho@aiims.edu.in",
    buyerLocation: "Mangalagiri (AIIMS Faculty)",
    unitInterested: "Tower B - 4 BHK Sky Villa (3,800 sq.ft)",
    budget: "₹3.4 Cr",
    inquiryType: "phone_reveal",
    notes: "Revealed builder direct phone number. Wants immediate site visit this Sunday morning.",
    status: "contacted",
    createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
  },
  {
    id: "lead-03",
    builderId: "bld-aditya-01",
    projectId: "amaravati-heights",
    projectName: "Amaravati Heights Luxury Towers",
    buyerName: "P. Satyanarayana Chowdary",
    buyerPhone: "+91 98855 67123",
    buyerEmail: "chowdary.infra@yahoo.co.in",
    buyerLocation: "Benz Circle, Vijayawada",
    unitInterested: "Tower C - 3 BHK Corner Duplex",
    budget: "₹2.5 Cr - ₹2.8 Cr",
    inquiryType: "brochure_download",
    notes: "Downloaded architectural floor plans & specification sheet after 6 minutes dwell time.",
    status: "new",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3.5).toISOString(),
  },
  {
    id: "lead-04",
    builderId: "bld-aditya-01",
    projectId: "amaravati-heights",
    projectName: "Amaravati Heights Luxury Towers",
    buyerName: "Anil Kumar Reddi",
    buyerPhone: "+91 97012 34567",
    buyerEmail: "anil.reddi@techcorp.com",
    buyerLocation: "Gachibowli, Hyderabad (Relocating to AP Capital)",
    unitInterested: "Tower A - 3 BHK Standard",
    budget: "₹1.8 Cr - ₹2 Cr",
    inquiryType: "site_visit",
    notes: "Submitted site tour request for next Saturday at 11:30 AM with family.",
    status: "scheduled",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
  },
  {
    id: "lead-05",
    builderId: "bld-aditya-01",
    projectId: "amaravati-heights",
    projectName: "Amaravati Heights Luxury Towers",
    buyerName: "G. Srinivasulu",
    buyerPhone: "+91 99480 91823",
    buyerEmail: "srinu.g@agrotrading.com",
    buyerLocation: "Guntur Market Yard, Guntur",
    unitInterested: "Ground Floor Commercial Showroom Unit",
    budget: "₹3.8 Cr",
    inquiryType: "whatsapp_chat",
    notes: "Inquired via WhatsApp for road-facing commercial space availability.",
    status: "contacted",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
  },
  {
    id: "lead-06",
    builderId: "bld-aditya-01",
    projectId: "road-skyline-towers",
    projectName: "ROAD Skyline Towers",
    buyerName: "M. Nageswara Rao",
    buyerPhone: "+91 98660 55443",
    buyerEmail: "mnrao.ca@gmail.com",
    buyerLocation: "Governorpet, Vijayawada",
    unitInterested: "Executive 3 BHK Penthouse",
    budget: "₹2.6 Cr",
    inquiryType: "phone_reveal",
    notes: "Clicked 'View Direct Builder Phone' on ROAD Skyline Towers project profile.",
    status: "new",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 31).toISOString(),
  }
];

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
  logoutBuilder: () => void;
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
  updateRequestStatus: (requestId: string, status: BuilderRequest["status"], adminNotes?: string) => Promise<void>;
  
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

export const useBuilderStore = create<BuilderStoreState>()(
  persist(
    (set, get) => ({
      builders: INITIAL_BUILDERS,
      currentBuilderId: null, // must authenticate with builder credentials
      requests: INITIAL_REQUESTS,
      activityLogs: INITIAL_LOGS,
      messages: INITIAL_MESSAGES,
      contactLeads: INITIAL_CONTACT_LEADS,
      isLoading: false,

      updateLeadStatus: (leadId, status) => {
        set((state) => ({
          contactLeads: state.contactLeads.map((l) =>
            l.id === leadId ? { ...l, status } : l
          ),
        }));
      },

      addContactLead: (lead) => {
        const newLead: BuilderContactLead = {
          ...lead,
          id: `lead-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          contactLeads: [newLead, ...state.contactLeads],
        }));
      },

      setCurrentBuilderId: (id) => {
        set({ currentBuilderId: id });
        if (id) {
          get().logActivity(id, "login", {
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Web",
            timestamp: new Date().toISOString()
          });
        }
      },

      logoutBuilder: () => {
        set({ currentBuilderId: null });
        if (typeof window !== "undefined") {
          localStorage.removeItem("road_builder_user");
          document.cookie = "road_builder_id=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("road_auth_changed"));
        }
      },

      getCurrentBuilder: () => {
        const { builders, currentBuilderId } = get();

        // 1. Direct ID match in store builders
        if (currentBuilderId) {
          const directMatch = builders.find(
            (b) =>
              b.id === currentBuilderId ||
              b.slug === currentBuilderId ||
              b.contactEmail?.toLowerCase() === currentBuilderId.toLowerCase()
          );
          if (directMatch) return directMatch;
        }

        // 2. Resolve from stored localStorage session if available
        if (typeof window !== "undefined") {
          try {
            const stored = localStorage.getItem("road_builder_user");
            if (stored) {
              const parsed = JSON.parse(stored);
              const targetId = parsed?.builderId || parsed?.id;
              const targetEmail = (parsed?.email || "").toLowerCase();
              const targetName = (parsed?.name || "").toLowerCase();

              // Match in active builders
              const sessionMatch = builders.find(
                (b) =>
                  (targetId && b.id === targetId) ||
                  (targetEmail && b.contactEmail?.toLowerCase() === targetEmail) ||
                  (targetName && b.companyName?.toLowerCase() === targetName) ||
                  (targetId && b.slug === targetId)
              );
              if (sessionMatch) return sessionMatch;

              // Match in initial catalog
              const initialMatch = INITIAL_BUILDERS.find(
                (b) =>
                  (targetId && b.id === targetId) ||
                  (targetEmail && b.contactEmail?.toLowerCase() === targetEmail) ||
                  (targetName && b.companyName?.toLowerCase() === targetName) ||
                  (targetId && b.slug === targetId)
              );
              if (initialMatch) return initialMatch;

              // Fallback dynamically synthesized profile for active session
              if (parsed?.name || parsed?.companyName) {
                return {
                  id: targetId || "bld-session",
                  companyName: parsed.name || parsed.companyName || "Builder Partner",
                  slug: parsed.slug || (parsed.name || "builder").toLowerCase().replace(/[^a-z0-9]/g, "-"),
                  logoUrl: parsed.logoUrl || "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=300&auto=format&fit=crop&q=80",
                  bannerUrl: parsed.bannerUrl || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
                  description: parsed.description || "Authorized real estate developer partner on ROAD Facing.",
                  tagline: parsed.tagline || "Building Landmark Living Spaces",
                  reraNumber: parsed.reraNumber || "PRM/KA/RERA/1251/310/PR/170915/000123",
                  crdaApproved: true,
                  contactEmail: parsed.email || "partner@roadfacing.com",
                  contactPhone: parsed.phone || "+91 98765 43210",
                  whatsappNumber: parsed.phone || "+91 98765 43210",
                  officeAddress: parsed.officeAddress || "AP Capital Region",
                  experienceYears: 15,
                  tier: parsed.tier || "titan",
                  isVerified: Boolean(parsed.isVerified ?? true),
                  assignedProjectIds: parsed.assignedProjectIds || ["amaravati-heights", "road-skyline-towers", "proj-amaravati-heights"],
                  assignedPropertyIds: parsed.assignedPropertyIds || [],
                  chatEnabled: true,
                  promotedAtTop: true,
                  bannerActive: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
              }
            }
          } catch {}
        }

        return null;
      },

      saveBuilderProfile: async (profile) => {
        const { builders } = get();
        const existingIndex = builders.findIndex((b) => b.id === profile.id);
        const now = new Date().toISOString();

        let updatedList: BuilderProfile[];
        if (existingIndex >= 0) {
          const updated = {
            ...builders[existingIndex],
            ...profile,
            updatedAt: now,
          };
          updatedList = [...builders];
          updatedList[existingIndex] = updated;
        } else {
          const newBuilder: BuilderProfile = {
            id: profile.id,
            companyName: profile.companyName,
            slug: profile.slug || profile.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
            logoUrl: profile.logoUrl || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&auto=format&fit=crop&q=80",
            bannerUrl: profile.bannerUrl,
            description: profile.description || "",
            tagline: profile.tagline || "",
            reraNumber: profile.reraNumber || "",
            crdaApproved: Boolean(profile.crdaApproved),
            contactEmail: profile.contactEmail || "",
            contactPhone: profile.contactPhone || "",
            whatsappNumber: profile.whatsappNumber || profile.contactPhone || "",
            officeAddress: profile.officeAddress || "",
            experienceYears: profile.experienceYears || 0,
            tier: profile.tier || "premium",
            isVerified: profile.isVerified ?? false,
            assignedProjectIds: profile.assignedProjectIds || [],
            assignedPropertyIds: profile.assignedPropertyIds || [],
            chatEnabled: profile.chatEnabled ?? true,
            promotedAtTop: profile.promotedAtTop ?? false,
            bannerActive: profile.bannerActive ?? false,
            loginCredentialsHint: profile.loginCredentialsHint || `${profile.contactEmail} / road2026`,
            createdAt: now,
            updatedAt: now,
          };
          updatedList = [newBuilder, ...builders];
        }

        set({ builders: updatedList });

        // Sync with Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            const target = updatedList.find((b) => b.id === profile.id);
            if (target) {
              await supabase.from("builder_profiles").upsert({
                id: target.id,
                company_name: target.companyName,
                slug: target.slug,
                logo_url: target.logoUrl,
                banner_url: target.bannerUrl,
                description: target.description,
                tagline: target.tagline,
                rera_number: target.reraNumber,
                crda_approved: target.crdaApproved,
                contact_email: target.contactEmail,
                contact_phone: target.contactPhone,
                whatsapp_number: target.whatsappNumber,
                office_address: target.officeAddress,
                experience_years: target.experienceYears,
                tier: target.tier,
                is_verified: target.isVerified,
                assigned_project_ids: target.assignedProjectIds,
                assigned_property_ids: target.assignedPropertyIds,
                chat_enabled: target.chatEnabled,
                promoted_at_top: target.promotedAtTop,
                banner_active: target.bannerActive,
                login_credentials_hint: target.loginCredentialsHint,
                updated_at: now,
              });
            }
          } catch (e) {
            console.warn("Supabase builder profile sync warning:", e);
          }
        }
      },

      deleteBuilderProfile: async (id) => {
        set((state) => ({
          builders: state.builders.filter((b) => b.id !== id),
          currentBuilderId: state.currentBuilderId === id ? null : state.currentBuilderId,
        }));
        if (isSupabaseConfigured()) {
          try {
            await supabase.from("builder_profiles").delete().eq("id", id);
          } catch {}
        }
      },

      assignProjectsToBuilder: async (builderId, projectIds, propertyIds = []) => {
        const { builders } = get();
        const updated = builders.map((b) => {
          if (b.id === builderId) {
            return {
              ...b,
              assignedProjectIds: projectIds,
              assignedPropertyIds: propertyIds,
              updatedAt: new Date().toISOString(),
            };
          }
          return b;
        });
        set({ builders: updated });
        get().logActivity(builderId, "edit_project", {
          action: "project_assignment_updated",
          projectCount: projectIds.length,
          assignedProjectIds: projectIds,
        });

        if (isSupabaseConfigured()) {
          try {
            await supabase
              .from("builder_profiles")
              .update({
                assigned_project_ids: projectIds,
                assigned_property_ids: propertyIds,
                updated_at: new Date().toISOString(),
              })
              .eq("id", builderId);
          } catch {}
        }
      },

      // Guarded content update: explicitly prevents modification of caption/tagline or project name
      updateProjectContentGuarded: async (projectId, builderId, allowedPayload) => {
        const builder = get().builders.find((b) => b.id === builderId);
        if (!builder) {
          return { success: false, error: "Unauthorized builder profile." };
        }

        // Verify project is in builder's assigned projects
        const isAssigned = builder.assignedProjectIds.some(
          (p) => p === projectId || projectId.includes(p) || p.includes(projectId)
        );
        if (!isAssigned) {
          return { success: false, error: "Access Denied: You are not assigned to this project." };
        }

        // Attempting to change locked fields will be rejected
        const forbiddenKeys = ["name", "tagline", "caption", "reraId", "reraApproved", "crdaApproved", "slug"];
        const payloadKeys = Object.keys(allowedPayload);
        const attemptedForbidden = payloadKeys.filter((k) => forbiddenKeys.includes(k));
        if (attemptedForbidden.length > 0) {
          return {
            success: false,
            error: `Security Guardrail: Builders cannot directly modify protected fields [${attemptedForbidden.join(", ")}]. Please submit a 'Caption / Legal Change Request' for Admin Review.`,
          };
        }

        // Save allowed changes in Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            const dbPayload: Record<string, any> = { updatedAt: new Date().toISOString() };
            if (allowedPayload.description !== undefined) dbPayload.description = allowedPayload.description;
            if (allowedPayload.highlights !== undefined) dbPayload.highlights = allowedPayload.highlights;
            if (allowedPayload.facilities !== undefined) dbPayload.facilities = allowedPayload.facilities;
            if (allowedPayload.constructionStatus !== undefined) dbPayload.constructionStatus = allowedPayload.constructionStatus;
            if (allowedPayload.constructionUpdates !== undefined) dbPayload.constructionUpdates = allowedPayload.constructionUpdates;

            await supabase.from("projects").update(dbPayload).eq("id", projectId);
          } catch (e) {
            console.error("Failed to update project text:", e);
          }
        }

        // Log this edit in audit history
        get().logActivity(builderId, "edit_project", {
          projectId,
          editedFields: Object.keys(allowedPayload),
        }, projectId);

        return { success: true };
      },

      submitRequest: async (reqData) => {
        const now = new Date().toISOString();
        const newRequest: BuilderRequest = {
          ...reqData,
          id: `req-${Date.now()}`,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          requests: [newRequest, ...state.requests],
        }));

        get().logActivity(reqData.builderId, "submit_request", {
          requestType: reqData.requestType,
          title: reqData.title,
          priority: reqData.priority,
        }, newRequest.id, reqData.title);

        if (isSupabaseConfigured()) {
          try {
            await supabase.from("builder_requests").insert({
              id: newRequest.id,
              builder_id: newRequest.builderId,
              builder_name: newRequest.builderName,
              request_type: newRequest.requestType,
              project_id: newRequest.projectId,
              project_name: newRequest.projectName,
              title: newRequest.title,
              details: newRequest.details,
              status: "pending",
              priority: newRequest.priority,
              created_at: now,
              updated_at: now,
            });
          } catch {}
        }

        return newRequest;
      },

      updateRequestStatus: async (requestId, status, adminNotes) => {
        const now = new Date().toISOString();
        const { requests } = get();
        const target = requests.find((r) => r.id === requestId);

        const updatedRequests = requests.map((r) => {
          if (r.id === requestId) {
            return {
              ...r,
              status,
              adminNotes: adminNotes ?? r.adminNotes,
              updatedAt: now,
            };
          }
          return r;
        });

        set({ requests: updatedRequests });

        // If approved and request was 'promote_top' or 'publish_banner', update builder profile flags
        if (target && status === "approved") {
          const { builders } = get();
          const builder = builders.find((b) => b.id === target.builderId);
          if (builder) {
            if (target.requestType === "promote_top") {
              get().saveBuilderProfile({ id: builder.id, companyName: builder.companyName, promotedAtTop: true });
            } else if (target.requestType === "publish_banner") {
              get().saveBuilderProfile({ id: builder.id, companyName: builder.companyName, bannerActive: true });
            }
          }
        }

        if (isSupabaseConfigured()) {
          try {
            await supabase
              .from("builder_requests")
              .update({
                status,
                admin_notes: adminNotes,
                updated_at: now,
              })
              .eq("id", requestId);
          } catch {}
        }
      },

      sendMessage: async (msgData) => {
        const now = new Date().toISOString();
        const newMsg: BuilderMessage = {
          ...msgData,
          id: `msg-${Date.now()}`,
          isRead: false,
          createdAt: now,
        };

        set((state) => ({
          messages: [...state.messages, newMsg],
        }));

        if (msgData.senderRole === "builder") {
          get().logActivity(msgData.builderId, "chat_message", {
            textPreview: msgData.message.slice(0, 50),
          });
        }

        if (isSupabaseConfigured()) {
          try {
            await supabase.from("builder_messages").insert({
              id: newMsg.id,
              builder_id: newMsg.builderId,
              request_id: newMsg.requestId,
              sender_role: newMsg.senderRole,
              sender_name: newMsg.senderName,
              message: newMsg.message,
              attachments: newMsg.attachments || [],
              is_read: false,
              created_at: now,
            });
          } catch {}
        }

        return newMsg;
      },

      markMessagesRead: async (builderId) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.builderId === builderId ? { ...m, isRead: true } : m
          ),
        }));
        if (isSupabaseConfigured()) {
          try {
            await supabase.from("builder_messages").update({ is_read: true }).eq("builder_id", builderId);
          } catch {}
        }
      },

      logActivity: async (builderId, actionType, details = {}, entityId, entityName) => {
        const builder = get().builders.find((b) => b.id === builderId);
        const builderName = builder?.companyName || "Builder Partner";
        const now = new Date().toISOString();

        const logItem: BuilderActivityLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          builderId,
          builderName,
          actionType,
          entityId,
          entityName,
          details,
          ipAddress: details.ip || "49.207.214.88",
          deviceInfo: details.userAgent || "Desktop / Chrome",
          createdAt: now,
        };

        // Also update builder's lastActiveAt
        const updatedBuilders = get().builders.map((b) => {
          if (b.id === builderId) {
            return {
              ...b,
              lastActiveAt: now,
              lastLoginAt: actionType === "login" ? now : b.lastLoginAt,
            };
          }
          return b;
        });

        set((state) => ({
          builders: updatedBuilders,
          activityLogs: [logItem, ...state.activityLogs.slice(0, 100)],
        }));

        if (isSupabaseConfigured()) {
          try {
            await supabase.from("builder_activity_logs").insert({
              id: logItem.id,
              builder_id: builderId,
              builder_name: builderName,
              action_type: actionType,
              entity_id: entityId,
              entity_name: entityName,
              details,
              ip_address: logItem.ipAddress,
              device_info: logItem.deviceInfo,
              created_at: now,
            });
          } catch {}
        }
      },

      fetchFromSupabase: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const { data: bData } = await supabase.from("builder_profiles").select("*");
          if (bData && bData.length > 0) {
            const mapped: BuilderProfile[] = bData.map((b: any) => ({
              id: b.id,
              userId: b.user_id,
              companyName: b.company_name,
              slug: b.slug,
              logoUrl: b.logo_url,
              bannerUrl: b.banner_url,
              description: b.description,
              tagline: b.tagline,
              reraNumber: b.rera_number,
              crdaApproved: b.crda_approved,
              contactEmail: b.contact_email,
              contactPhone: b.contact_phone,
              whatsappNumber: b.whatsapp_number,
              officeAddress: b.office_address,
              experienceYears: b.experience_years,
              tier: b.tier || "premium",
              isVerified: b.is_verified,
              assignedProjectIds: b.assigned_project_ids || [],
              assignedPropertyIds: b.assigned_property_ids || [],
              chatEnabled: b.chat_enabled ?? true,
              promotedAtTop: b.promoted_at_top ?? false,
              bannerActive: b.banner_active ?? false,
              lastLoginAt: b.last_login_at,
              lastActiveAt: b.last_active_at,
              loginCredentialsHint: b.login_credentials_hint,
              createdAt: b.created_at,
              updatedAt: b.updated_at,
            }));
            set({ builders: mapped });
          }

          const { data: rData } = await supabase.from("builder_requests").select("*").order("created_at", { ascending: false });
          if (rData && rData.length > 0) {
            set({
              requests: rData.map((r: any) => ({
                id: r.id,
                builderId: r.builder_id,
                builderName: r.builder_name,
                requestType: r.request_type,
                projectId: r.project_id,
                projectName: r.project_name,
                title: r.title,
                details: r.details || {},
                status: r.status,
                adminNotes: r.admin_notes,
                priority: r.priority || "normal",
                createdAt: r.created_at,
                updatedAt: r.updated_at,
              })),
            });
          }
        } catch (e) {
          console.warn("Could not sync from Supabase builder tables:", e);
        }
      },
    }),
    {
      name: "road-builder-store",
    }
  )
);
