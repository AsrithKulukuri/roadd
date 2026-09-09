"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Users,
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Send,
  Eye,
  Check,
  X,
  RefreshCw,
  FolderOpen,
  ArrowUpRight,
  MapPin,
  Phone,
  Mail,
  Lock,
  Flame,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  Shield,
  Layers,
  Award,
  Calendar,
  AlertCircle
} from "lucide-react";
import { useBuilderStore, BuilderProfile, BuilderRequest, BuilderActivityLog } from "@/stores/builder-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useSchedulesStore } from "@/stores/schedules-store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function AdminBuildersPage() {
  const {
    builders,
    requests,
    activityLogs,
    saveBuilderProfile,
    deleteBuilderProfile,
    assignProjectsToBuilder,
    updateRequestStatus,
    sendMessage,
    messages,
    fetchFromSupabase,
  } = useBuilderStore();

  const { projects, fetchProjects } = useProjectsStore();
  const { schedules, fetchSchedules } = useSchedulesStore();

  const [activeTab, setActiveTab] = useState<"directory" | "activity" | "requests">("directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");

  // Builder Modal (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBuilder, setEditingBuilder] = useState<BuilderProfile | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [reraNumber, setReraNumber] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [tier, setTier] = useState<"starter" | "premium" | "titan">("premium");
  const [loginCredentialsHint, setLoginCredentialsHint] = useState("");
  const [isVerified, setIsVerified] = useState(true);
  const [crdaApproved, setCrdaApproved] = useState(true);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // Request & Chat Drawer
  const [activeRequest, setActiveRequest] = useState<BuilderRequest | null>(null);
  const [chatMessageText, setChatMessageText] = useState("");
  const [adminNoteInput, setAdminNoteInput] = useState("");

  useEffect(() => {
    fetchFromSupabase();
    fetchProjects();
    fetchSchedules();
  }, [fetchFromSupabase, fetchProjects, fetchSchedules]);

  // Open modal for new builder
  const handleOpenCreateModal = () => {
    setEditingBuilder(null);
    setCompanyName("");
    setContactEmail("");
    setContactPhone("");
    setWhatsappNumber("");
    setReraNumber("");
    setTagline("");
    setDescription("");
    setTier("premium");
    setLoginCredentialsHint("");
    setIsVerified(true);
    setCrdaApproved(true);
    setSelectedProjectIds([]);
    setIsModalOpen(true);
  };

  // Open modal to edit existing builder
  const handleOpenEditModal = (builder: BuilderProfile) => {
    setEditingBuilder(builder);
    setCompanyName(builder.companyName);
    setContactEmail(builder.contactEmail);
    setContactPhone(builder.contactPhone);
    setWhatsappNumber(builder.whatsappNumber || builder.contactPhone);
    setReraNumber(builder.reraNumber || "");
    setTagline(builder.tagline || "");
    setDescription(builder.description || "");
    setTier(builder.tier);
    setLoginCredentialsHint(builder.loginCredentialsHint || `${builder.contactEmail} / road2026`);
    setIsVerified(builder.isVerified);
    setCrdaApproved(Boolean(builder.crdaApproved));
    setSelectedProjectIds(builder.assignedProjectIds || []);
    setIsModalOpen(true);
  };

  // Save builder profile
  const handleSaveBuilder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactEmail.trim() || !contactPhone.trim()) {
      toast.error("Please fill in Company Name, Email, and Phone.");
      return;
    }

    const builderId = editingBuilder ? editingBuilder.id : `bld-${Date.now()}`;
    const cleanSlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    await saveBuilderProfile({
      id: builderId,
      companyName,
      slug: editingBuilder?.slug || cleanSlug,
      contactEmail,
      contactPhone,
      whatsappNumber: whatsappNumber || contactPhone,
      reraNumber,
      tagline,
      description,
      tier,
      isVerified,
      crdaApproved,
      assignedProjectIds: selectedProjectIds,
      loginCredentialsHint: loginCredentialsHint || `${contactEmail} / road2026`,
    });

    toast.success(editingBuilder ? "Builder Profile Updated!" : "New Builder Partner Provisioned!");
    setIsModalOpen(false);
  };

  // Quick project toggle
  const toggleProjectAssignment = (projectId: string) => {
    if (selectedProjectIds.includes(projectId)) {
      setSelectedProjectIds(selectedProjectIds.filter((id) => id !== projectId));
    } else {
      setSelectedProjectIds([...selectedProjectIds, projectId]);
    }
  };

  // Handle request approval
  const handleApproveRequest = async (req: BuilderRequest) => {
    await updateRequestStatus(
      req.id,
      "approved",
      adminNoteInput.trim() || "Approved by ROAD Administration."
    );
    toast.success(`Request '${req.title}' has been approved and activated!`);
    setActiveRequest(null);
    setAdminNoteInput("");
  };

  // Handle request rejection
  const handleRejectRequest = async (req: BuilderRequest) => {
    await updateRequestStatus(
      req.id,
      "rejected",
      adminNoteInput.trim() || "Declined: Request does not meet current shelf criteria."
    );
    toast.error(`Request rejected with feedback note.`);
    setActiveRequest(null);
    setAdminNoteInput("");
  };

  // Send admin chat message to builder
  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessageText.trim() || !activeRequest) return;

    await sendMessage({
      builderId: activeRequest.builderId,
      requestId: activeRequest.id,
      senderRole: "admin",
      senderName: "ROAD Curation Team",
      message: chatMessageText.trim(),
    });

    setChatMessageText("");
    toast.success("Message dispatched to Builder's Portal");
  };

  // Filtered Builders
  const filteredBuilders = useMemo(() => {
    return builders.filter((b) => {
      const matchesSearch =
        b.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.reraNumber && b.reraNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTier = tierFilter === "all" || b.tier === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [builders, searchQuery, tierFilter]);

  // Filtered Requests
  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === "pending" || r.status === "under_review").length;
  }, [requests]);

  // Request messages
  const currentThreadMessages = useMemo(() => {
    if (!activeRequest) return [];
    return messages.filter((m) => m.builderId === activeRequest.builderId);
  }, [messages, activeRequest]);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="h-7 w-7 text-amber-500" />
              Builder Enterprise & Partner Management
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Enterprise Hub
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Provision builder logins, assign restricted projects/properties, monitor real-time activity, and approve concierge requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/builder"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-all shadow-sm"
          >
            <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
            Preview Builder Portal
          </Link>
          <Button
            onClick={handleOpenCreateModal}
            className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold text-xs shadow-md gap-2"
          >
            <Plus className="h-4 w-4" />
            Provision New Builder
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Builders</span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Building2 className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">{builders.length}</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {builders.filter((b) => b.isVerified).length} RERA Verified Partners
          </p>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned Projects</span>
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <FolderOpen className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {builders.reduce((acc, b) => acc + (b.assignedProjectIds?.length || 0), 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Across Vijayawada & Amaravati</p>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Concierge Requests</span>
            <span className="p-2 rounded-lg bg-purple-500/10 text-purple-500 relative">
              <Sparkles className="h-4 w-4" />
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
              )}
            </span>
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 flex items-center gap-2">
            {requests.length}
            {pendingRequestsCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-normal">
                {pendingRequestsCount} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Top promos, banners & caption updates</p>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audit Events</span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Radio className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">{activityLogs.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Real-time login & text edit tracking</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        <button
          onClick={() => setActiveTab("directory")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            activeTab === "directory"
              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Building2 className="h-4 w-4" />
          Builder Directory & Access Control ({builders.length})
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors relative",
            activeTab === "requests"
              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Sparkles className="h-4 w-4" />
          Concierge Requests & Approvals
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("activity")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            activeTab === "activity"
              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Radio className="h-4 w-4" />
          Live Audit Logs ({activityLogs.length})
        </button>
      </div>

      {/* TAB 1: BUILDER DIRECTORY */}
      {activeTab === "directory" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/50">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search builder, email, RERA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground"
              >
                <option value="all">All Tiers</option>
                <option value="titan">Titan Developer</option>
                <option value="premium">Premium Partner</option>
                <option value="starter">Starter</option>
              </select>
            </div>
          </div>

          {/* Builders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredBuilders.map((builder) => (
              <div
                key={builder.id}
                className="bg-card border border-border/50 hover:border-amber-500/40 rounded-xl p-5 shadow-sm transition-all relative flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {builder.logoUrl ? (
                        <img
                          src={builder.logoUrl}
                          alt={builder.companyName}
                          className="w-12 h-12 rounded-xl object-cover border border-border/50"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-base">
                          {builder.companyName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base text-foreground group-hover:text-amber-400 transition-colors">
                            {builder.companyName}
                          </h3>
                          {builder.isVerified && (
                            <span title="Verified Builder">
                              <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {builder.tagline || "Landmark Developer"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                        builder.tier === "titan"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : builder.tier === "premium"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700"
                      )}
                    >
                      {builder.tier}
                    </span>
                  </div>

                  {/* Badges / Credentials Hint */}
                  <div className="mt-4 pt-3 border-t border-border/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-amber-500" />
                        Credentials Hint:
                      </span>
                      <span className="font-mono text-[11px] bg-muted/60 px-2 py-0.5 rounded text-foreground">
                        {builder.loginCredentialsHint || `${builder.contactEmail} / road2026`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-blue-400" />
                        Portal Login:
                      </span>
                      <span className="text-foreground">{builder.contactEmail}</span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
                        Portal Login URL:
                      </span>
                      <Link
                        href="/builder/login"
                        target="_blank"
                        className="text-amber-400 hover:underline font-mono text-[11px]"
                      >
                        /builder/login
                      </Link>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-emerald-400" />
                        Phone / WhatsApp:
                      </span>
                      <span className="text-foreground">{builder.contactPhone}</span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-zinc-400" />
                        Last Active:
                      </span>
                      <span className="text-foreground">
                        {builder.lastActiveAt ? new Date(builder.lastActiveAt).toLocaleString() : "Recently Provisioned"}
                      </span>
                    </div>
                  </div>

                  {/* Assigned Projects */}
                  <div className="mt-4 pt-3 border-t border-border/30">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
                        Assigned Projects ({builder.assignedProjectIds?.length || 0})
                      </span>
                      <span className="text-[10px] text-muted-foreground">Restricted to these only</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {builder.assignedProjectIds && builder.assignedProjectIds.length > 0 ? (
                        builder.assignedProjectIds.map((projId) => {
                          const p = projects.find((x) => x.id === projId || x.slug === projId);
                          return (
                            <span
                              key={projId}
                              className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 text-[11px]"
                            >
                              {p?.name || projId}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          No projects assigned yet. Click Edit to assign.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 pt-3 border-t border-border/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {builder.promotedAtTop && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <Flame className="h-3 w-3 text-amber-400" /> Top Promoted
                      </span>
                    )}
                    {builder.bannerActive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                        <Sparkles className="h-3 w-3 text-purple-400" /> Hero Banner
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleOpenEditModal(builder)}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1.5"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Configure Access
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm(`Remove builder profile for ${builder.companyName}?`)) {
                          deleteBuilderProfile(builder.id);
                          toast.success("Builder removed");
                        }
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: CONCIERGE REQUESTS */}
      {activeTab === "requests" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border/50">
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Builder Marketing & Custom Requests
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Builders submit requests to feature at top of shelves, publish homepage banners, and submit caption updates.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
              {requests.length} Total Filed
            </span>
          </div>

          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className={cn(
                  "bg-card border rounded-xl p-5 shadow-sm transition-all",
                  req.status === "pending"
                    ? "border-amber-500/50 bg-amber-500/[0.02]"
                    : "border-border/50"
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                          req.requestType === "publish_banner"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                            : req.requestType === "promote_top"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : req.requestType === "caption_change"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        )}
                      >
                        {req.requestType.replace("_", " ")}
                      </span>
                      <h3 className="font-semibold text-base text-foreground">{req.title}</h3>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                          req.status === "approved"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : req.status === "rejected"
                            ? "bg-rose-500/15 text-rose-400"
                            : "bg-amber-500/15 text-amber-400"
                        )}
                      >
                        {req.status}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="font-medium text-foreground">{req.builderName}</span>
                      <span>•</span>
                      <span>Target: {req.projectName || "General Portal"}</span>
                      <span>•</span>
                      <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                    </p>

                    {/* Proposed details */}
                    {req.details?.proposedCaption && (
                      <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs">
                        <span className="text-muted-foreground font-semibold">Proposed Caption:</span>{" "}
                        <span className="text-foreground italic">"{req.details.proposedCaption}"</span>
                      </div>
                    )}
                    {req.details?.proposedBannerUrl && (
                      <div className="mt-2 flex items-center gap-3">
                        <img
                          src={req.details.proposedBannerUrl}
                          alt="Banner Creative"
                          className="h-16 w-32 rounded-lg object-cover border border-border/50"
                        />
                        <span className="text-xs text-muted-foreground">Proposed Banner Creative attached</span>
                      </div>
                    )}
                    {req.details?.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1">Note: {req.details.notes}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => setActiveRequest(req)}
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 h-8"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                      Chat / Review
                    </Button>

                    {req.status === "pending" && (
                      <>
                        <Button
                          onClick={() => handleApproveRequest(req)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleRejectRequest(req)}
                          variant="ghost"
                          size="sm"
                          className="text-xs text-rose-400 hover:bg-rose-500/10 h-8 gap-1"
                        >
                          <X className="h-3.5 w-3.5" />
                          Decline
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LIVE AUDIT LOGS */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <div className="bg-card p-4 rounded-xl border border-border/50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
                Builder Portal Audit & Activity Timeline
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tracks exact builder logins, IP addresses, project text modifications, and schedule reviews.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-muted text-muted-foreground font-mono">
              Live Feed
            </span>
          </div>

          <div className="bg-card border border-border/50 rounded-xl divide-y divide-border/40">
            {activityLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-start justify-between gap-4 text-xs hover:bg-muted/20">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "p-2 rounded-lg shrink-0 mt-0.5",
                      log.actionType === "login"
                        ? "bg-blue-500/10 text-blue-400"
                        : log.actionType === "edit_project"
                        ? "bg-amber-500/10 text-amber-400"
                        : log.actionType === "submit_request"
                        ? "bg-purple-500/10 text-purple-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    )}
                  >
                    {log.actionType === "login" ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : log.actionType === "edit_project" ? (
                      <Edit className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{log.builderName}</span>
                      <span className="px-1.5 py-0.2 rounded bg-muted text-[10px] uppercase font-mono text-muted-foreground">
                        {log.actionType.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {log.actionType === "login" && "Logged into Builder Enterprise Console"}
                      {log.actionType === "edit_project" &&
                        `Updated content/milestones for: ${log.entityName || log.entityId || "Project"}`}
                      {log.actionType === "submit_request" &&
                        `Submitted marketing request: ${log.entityName || "Promotion"}`}
                      {log.actionType === "chat_message" && "Sent direct concierge message to Admin"}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground font-mono">
                      <span>IP: {log.ipAddress || "49.207.214.88"}</span>
                      <span>•</span>
                      <span>Device: {log.deviceInfo || "Desktop / Chrome"}</span>
                    </div>
                  </div>
                </div>

                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE / EDIT BUILDER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-amber-500" />
                  {editingBuilder ? "Configure Builder Profile & Access" : "Provision New Builder Partner"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Set login credentials, assign restricted projects, and grant permissions.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBuilder} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-300 font-medium">Company Name *</label>
                  <Input
                    required
                    placeholder="e.g. Sri Aditya Homes"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-zinc-800/80 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-medium">RERA Registration No</label>
                  <Input
                    placeholder="e.g. P06180020199"
                    value={reraNumber}
                    onChange={(e) => setReraNumber(e.target.value)}
                    className="bg-zinc-800/80 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-medium">Official Contact Email (Login ID) *</label>
                  <Input
                    required
                    type="email"
                    placeholder="director@company.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="bg-zinc-800/80 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-medium">Phone / WhatsApp *</label>
                  <Input
                    required
                    placeholder="+91 98490 12345"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="bg-zinc-800/80 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-medium">Portal Credentials Hint</label>
                  <Input
                    placeholder="e.g. director@company.com / road2026"
                    value={loginCredentialsHint}
                    onChange={(e) => setLoginCredentialsHint(e.target.value)}
                    className="bg-zinc-800/80 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-medium">Developer Tier</label>
                  <select
                    value={tier}
                    onChange={(e: any) => setTier(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-800/80 border border-zinc-700 text-white text-xs"
                  >
                    <option value="titan">Titan Developer (Highest Trust)</option>
                    <option value="premium">Premium Partner</option>
                    <option value="starter">Starter Developer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Brand Tagline</label>
                <Input
                  placeholder="e.g. Crafting Architectural Landmarks of Tomorrow"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="bg-zinc-800/80 border-zinc-700 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Company Bio / Narrative</label>
                <Textarea
                  rows={2}
                  placeholder="Brief overview of track record..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-zinc-800/80 border-zinc-700 text-white text-xs"
                />
              </div>

              {/* PROJECT ASSIGNMENT SELECTOR */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-200 font-semibold flex items-center gap-1.5">
                    <FolderOpen className="h-4 w-4 text-amber-500" />
                    Assign Projects (Restricted Scope)
                  </label>
                  <span className="text-[11px] text-zinc-400">
                    {selectedProjectIds.length} Selected
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Select which projects this builder can view and manage. All other inventory remains strictly isolated.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  {projects.map((proj) => {
                    const isSelected = selectedProjectIds.includes(proj.id) || selectedProjectIds.includes(proj.slug);
                    return (
                      <button
                        type="button"
                        key={proj.id}
                        onClick={() => toggleProjectAssignment(proj.id)}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg text-left text-xs transition-all border",
                          isSelected
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-medium"
                            : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                        )}
                      >
                        <span className="line-clamp-1">{proj.name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-amber-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Verified toggles */}
              <div className="flex items-center gap-6 pt-2 border-t border-zinc-800">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={isVerified}
                    onChange={(e) => setIsVerified(e.target.checked)}
                    className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span>RERA Verified Badge</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={crdaApproved}
                    onChange={(e) => setCrdaApproved(e.target.checked)}
                    className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span>CRDA Approved</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold">
                  {editingBuilder ? "Update Builder Profile" : "Save & Provision Access"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST REVIEW & CHAT DRAWER */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-zinc-900 border-l border-zinc-800 w-full max-w-lg h-full flex flex-col justify-between shadow-2xl p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    {activeRequest.requestType.replace("_", " ")}
                  </span>
                  <h3 className="font-bold text-base text-white mt-1">{activeRequest.title}</h3>
                  <p className="text-xs text-zinc-400">{activeRequest.builderName}</p>
                </div>
                <button
                  onClick={() => setActiveRequest(null)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Details box */}
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs space-y-2">
                {activeRequest.details?.proposedCaption && (
                  <div>
                    <span className="text-zinc-400 font-semibold">Proposed Caption:</span>
                    <p className="text-zinc-200 italic mt-0.5">"{activeRequest.details.proposedCaption}"</p>
                  </div>
                )}
                {activeRequest.details?.proposedBannerUrl && (
                  <div>
                    <span className="text-zinc-400 font-semibold">Banner Creative:</span>
                    <img
                      src={activeRequest.details.proposedBannerUrl}
                      alt="Banner Preview"
                      className="mt-1 rounded-lg w-full h-32 object-cover border border-zinc-800"
                    />
                  </div>
                )}
                {activeRequest.details?.notes && (
                  <div>
                    <span className="text-zinc-400 font-semibold">Builder's Note:</span>
                    <p className="text-zinc-300 mt-0.5">{activeRequest.details.notes}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {activeRequest.status === "pending" && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs text-zinc-400 font-medium">Admin Feedback Note</label>
                  <Input
                    placeholder="Feedback or scheduling details..."
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white text-xs"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={() => handleApproveRequest(activeRequest)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Approve & Activate
                    </Button>
                    <Button
                      onClick={() => handleRejectRequest(activeRequest)}
                      variant="outline"
                      className="w-full text-rose-400 border-rose-500/30 hover:bg-rose-500/10 text-xs h-8"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              )}

              {/* Chat Thread */}
              <div className="pt-4 border-t border-zinc-800">
                <h4 className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
                  Direct Concierge Thread
                </h4>
                <div className="h-44 overflow-y-auto space-y-2 p-2 rounded-xl bg-zinc-950/50 border border-zinc-800 text-xs">
                  {currentThreadMessages.length > 0 ? (
                    currentThreadMessages.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "p-2.5 rounded-lg max-w-[85%]",
                          m.senderRole === "admin"
                            ? "ml-auto bg-amber-500/20 border border-amber-500/30 text-amber-200"
                            : "mr-auto bg-zinc-800 border border-zinc-700 text-zinc-200"
                        )}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-75 mb-1">
                          <span>{m.senderName}</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p>{m.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-500 text-xs italic">
                      No messages yet. Send a note to the builder.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendAdminMessage} className="pt-4 border-t border-zinc-800 flex items-center gap-2">
              <Input
                placeholder="Type response to builder..."
                value={chatMessageText}
                onChange={(e) => setChatMessageText(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white text-xs"
              />
              <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-zinc-950 h-9 px-3">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
