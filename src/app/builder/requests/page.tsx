"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Flame,
  MessageSquare,
  Edit,
  Send,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Building2,
  Check,
  X,
  Zap,
  Phone,
  Image as ImageIcon,
  FolderOpen
} from "lucide-react";
import { useBuilderStore, BuilderRequest } from "@/stores/builder-store";
import { useProjectsStore } from "@/stores/projects-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BuilderRequestsPage() {
  const { getCurrentBuilder, requests, submitRequest, sendMessage, messages, markMessagesRead } = useBuilderStore();
  const { projects } = useProjectsStore();

  const currentBuilder = getCurrentBuilder();

  // Active form modal
  const [selectedFormType, setSelectedFormType] = useState<
    "promote_top" | "publish_banner" | "enable_chat" | "caption_change" | "custom_concierge" | null
  >(null);

  // Form inputs
  const [targetProjectId, setTargetProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [proposedCaption, setProposedCaption] = useState("");
  const [proposedBannerUrl, setProposedBannerUrl] = useState("");
  const [shelfId, setShelfId] = useState("shelf-luxury-high-rises");
  const [durationDays, setDurationDays] = useState(14);
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "urgent">("normal");

  // Chat message state
  const [chatInput, setChatInput] = useState("");

  // Filter ONLY this builder's requests
  const myRequests = useMemo(() => {
    if (!currentBuilder) return [];
    return requests.filter((r) => r.builderId === currentBuilder.id);
  }, [requests, currentBuilder]);

  // Assigned projects list for dropdown
  const assignedProjects = useMemo(() => {
    if (!currentBuilder?.assignedProjectIds) return [];
    return projects.filter((p) =>
      currentBuilder.assignedProjectIds.some(
        (id) => id === p.id || id === p.slug || p.id.includes(id) || p.slug.includes(id)
      )
    );
  }, [projects, currentBuilder]);

  // Chat thread messages
  const threadMessages = useMemo(() => {
    if (!currentBuilder) return [];
    return messages.filter((m) => m.builderId === currentBuilder.id);
  }, [messages, currentBuilder]);

  useEffect(() => {
    if (currentBuilder) {
      markMessagesRead(currentBuilder.id);
    }
  }, [currentBuilder, markMessagesRead]);

  // Handle open request form
  const handleOpenForm = (type: typeof selectedFormType) => {
    setSelectedFormType(type);
    setTargetProjectId(assignedProjects[0]?.id || "");
    setNotes("");
    setProposedCaption("");
    setProposedBannerUrl("");

    if (type === "promote_top") {
      setTitle("Request Top of Shelf Placement");
    } else if (type === "publish_banner") {
      setTitle("Request Homepage Hero Banner Campaign");
    } else if (type === "enable_chat") {
      setTitle("Enable Direct Buyer WhatsApp & Lead Chat");
    } else if (type === "caption_change") {
      setTitle("Request Marketing Caption Revision");
    } else {
      setTitle("Custom Concierge Inquiry");
    }
  };

  // Submit request to admin
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBuilder || !selectedFormType || !title.trim()) return;

    const selectedProj = assignedProjects.find((p) => p.id === targetProjectId || p.slug === targetProjectId);

    await submitRequest({
      builderId: currentBuilder.id,
      builderName: currentBuilder.companyName,
      requestType: selectedFormType,
      projectId: targetProjectId || undefined,
      projectName: selectedProj?.name || undefined,
      title: title.trim(),
      details: {
        proposedCaption: proposedCaption.trim() || undefined,
        proposedBannerUrl: proposedBannerUrl.trim() || undefined,
        shelfId: selectedFormType === "promote_top" ? shelfId : undefined,
        durationDays,
        notes: notes.trim() || undefined,
      },
      priority,
    });

    toast.success("Concierge request dispatched to ROAD Admin team!");
    setSelectedFormType(null);
  };

  // Send direct message to admin
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentBuilder) return;

    await sendMessage({
      builderId: currentBuilder.id,
      senderRole: "builder",
      senderName: currentBuilder.companyName,
      message: chatInput.trim(),
    });

    setChatInput("");
    toast.success("Message delivered to ROAD Administration");
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-border/40 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-500" />
              Builder Concierge & Marketing Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Req Admin Anything
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Direct channel to ROAD administration. Request top promotions, hero banners, lead chats, caption revisions, and custom concierge support.
          </p>
        </div>
      </div>

      {/* QUICK LAUNCH REQUEST BUTTONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => handleOpenForm("promote_top")}
          className="p-5 rounded-2xl bg-card border border-border/50 hover:border-amber-500/50 text-left transition-all group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 w-fit mb-3 group-hover:scale-105 transition-transform">
              <Flame className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-amber-400 transition-colors">
              Promote at Top of Shelf
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Pin your venture to the top of homepage category shelves & search results.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-amber-400">
            <span>Launch Request</span> →
          </div>
        </button>

        <button
          onClick={() => handleOpenForm("publish_banner")}
          className="p-5 rounded-2xl bg-card border border-border/50 hover:border-purple-500/50 text-left transition-all group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 w-fit mb-3 group-hover:scale-105 transition-transform">
              <ImageIcon className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-purple-400 transition-colors">
              Publish in Hero Banner
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Feature in prime 1600px homepage carousel for maximum buyer eyeballs.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-purple-400">
            <span>Submit Creative</span> →
          </div>
        </button>

        <button
          onClick={() => handleOpenForm("enable_chat")}
          className="p-5 rounded-2xl bg-card border border-border/50 hover:border-emerald-500/50 text-left transition-all group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit mb-3 group-hover:scale-105 transition-transform">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-emerald-400 transition-colors">
              Enable Lead Chat
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Activate direct WhatsApp buyer routing and interactive concierge inquiry chat.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <span>Enable Channel</span> →
          </div>
        </button>

        <button
          onClick={() => handleOpenForm("custom_concierge")}
          className="p-5 rounded-2xl bg-card border border-border/50 hover:border-blue-500/50 text-left transition-all group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 w-fit mb-3 group-hover:scale-105 transition-transform">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-blue-400 transition-colors">
              Custom Concierge Request
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Request bespoke marketing, pricing revisions, or legal badge additions.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-400">
            <span>Custom Ticket</span> →
          </div>
        </button>
      </div>

      {/* TWO COLUMNS: REQUEST TRACKER & DIRECT ADMIN CHAT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: My Filed Requests Tracker */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              My Concierge Requests ({myRequests.length})
            </h2>
            <span className="text-xs text-muted-foreground">Real-time status tracking</span>
          </div>

          <div className="space-y-3">
            {myRequests.length > 0 ? (
              myRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                          req.requestType === "promote_top"
                            ? "bg-amber-500/15 text-amber-400"
                            : req.requestType === "publish_banner"
                            ? "bg-purple-500/15 text-purple-400"
                            : req.requestType === "enable_chat"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-blue-500/15 text-blue-400"
                        )}
                      >
                        {req.requestType.replace("_", " ")}
                      </span>
                      <h3 className="font-bold text-sm text-foreground">{req.title}</h3>
                    </div>

                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit",
                        req.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : req.status === "rejected"
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      )}
                    >
                      {req.status}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Target: <span className="text-foreground font-medium">{req.projectName || "General Portal"}</span> • Filed on {new Date(req.createdAt).toLocaleDateString()}
                  </p>

                  {/* Details summary */}
                  {req.details?.proposedCaption && (
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/30 text-xs">
                      <span className="text-muted-foreground font-semibold">Proposed Caption:</span>{" "}
                      <span className="text-foreground italic">"{req.details.proposedCaption}"</span>
                    </div>
                  )}

                  {req.details?.proposedBannerUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      <img
                        src={req.details.proposedBannerUrl}
                        alt="Proposed Banner"
                        className="h-16 w-32 rounded-lg object-cover border border-border/40"
                      />
                      <span className="text-xs text-muted-foreground">Banner creative submitted for review</span>
                    </div>
                  )}

                  {/* Admin feedback note */}
                  {req.adminNotes && (
                    <div className="p-2.5 rounded-lg bg-amber-500/[0.05] border border-amber-500/20 text-xs flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-amber-400">Admin Response:</span>
                        <p className="text-zinc-300 mt-0.5">{req.adminNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-card border border-dashed border-border p-8 rounded-xl text-center text-xs text-muted-foreground">
                You haven't filed any concierge requests yet. Click any button above to submit a request.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Integrated Two-Way Admin Chat */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-500" />
              Admin Concierge Desk
            </h2>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Online
            </span>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm flex flex-col h-[460px] justify-between">
            <div className="overflow-y-auto space-y-3 pr-1 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/30 text-muted-foreground text-center text-[11px]">
                Welcome to your dedicated Enterprise Concierge Desk. Ask questions about billing, promotions, or customized campaigns.
              </div>

              {threadMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "p-3 rounded-xl max-w-[85%] space-y-1 shadow-sm",
                    msg.senderRole === "builder"
                      ? "ml-auto bg-amber-500/15 border border-amber-500/30 text-amber-100"
                      : "mr-auto bg-zinc-800 border border-zinc-700 text-zinc-200"
                  )}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-75">
                    <span className="font-bold">{msg.senderRole === "builder" ? "You" : "ROAD Admin"}</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="leading-relaxed">{msg.message}</p>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-border/40 flex items-center gap-2">
              <Input
                placeholder="Message ROAD Admin desk..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="text-xs h-9"
              />
              <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-zinc-950 h-9 px-3">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* REQUEST SUBMISSION MODAL */}
      {selectedFormType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {selectedFormType.replace("_", " ")}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{title}</h3>
              </div>
              <button
                onClick={() => setSelectedFormType(null)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold">Select Target Project *</label>
                <select
                  value={targetProjectId}
                  onChange={(e) => setTargetProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs"
                >
                  {assignedProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedFormType === "promote_top" && (
                <>
                  <div className="space-y-1">
                    <label className="text-zinc-300 font-semibold">Target Homepage Shelf</label>
                    <select
                      value={shelfId}
                      onChange={(e) => setShelfId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs"
                    >
                      <option value="shelf-luxury-high-rises">Verified Luxury High-Rises</option>
                      <option value="shelf-luxury-villas">Signature Gated Villas</option>
                      <option value="shelf-road-exclusive">ROAD Exclusive Launches</option>
                      <option value="shelf-amaravati-focus">Amaravati Capital Region Spotlight</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-300 font-semibold">Campaign Duration (Days)</label>
                    <Input
                      type="number"
                      min={7}
                      max={90}
                      value={durationDays}
                      onChange={(e) => setDurationDays(parseInt(e.target.value) || 14)}
                      className="bg-zinc-800 border-zinc-700 text-white text-xs"
                    />
                  </div>
                </>
              )}

              {selectedFormType === "publish_banner" && (
                <>
                  <div className="space-y-1">
                    <label className="text-zinc-300 font-semibold">Hero Banner Creative Image URL *</label>
                    <Input
                      required
                      placeholder="https://images.unsplash.com/... or hosted image link"
                      value={proposedBannerUrl}
                      onChange={(e) => setProposedBannerUrl(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-300 font-semibold">Proposed Hero Headline / Slogan *</label>
                    <Input
                      required
                      placeholder="e.g. Amaravati's Most Anticipated Road-Facing Luxury Community"
                      value={proposedCaption}
                      onChange={(e) => setProposedCaption(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white text-xs"
                    />
                  </div>
                </>
              )}

              {selectedFormType === "caption_change" && (
                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold">Proposed New Marketing Caption *</label>
                  <Input
                    required
                    placeholder="e.g. 4 BHK Ultra-Luxury Sky Mansions on MG Road"
                    value={proposedCaption}
                    onChange={(e) => setProposedCaption(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white text-xs"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold">Instructions or Notes for Admin</label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide any campaign goals, dates, or specific requirements..."
                  className="bg-zinc-800 border-zinc-700 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedFormType(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold">
                  Submit Request to Admin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
