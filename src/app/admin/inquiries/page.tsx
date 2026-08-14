"use client";

import { useState } from "react";
import { useInquiriesStore, BuyerRequirement } from "@/stores/inquiries-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  MapPin, 
  IndianRupee, 
  Building2, 
  Calendar, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Clock, 
  Send,
  ExternalLink,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminInquiriesPage() {
  const { requirements, updateStatus, deleteRequirement } = useInquiriesStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "contacted" | "closed">("all");

  const filteredRequirements = requirements.filter((req) => {
    if (statusFilter !== "all" && req.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        req.name.toLowerCase().includes(q) ||
        req.phone.includes(q) ||
        req.location.toLowerCase().includes(q) ||
        req.propertyType.toLowerCase().includes(q) ||
        (req.notes && req.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const newCount = requirements.filter((r) => r.status === "new").length;
  const contactedCount = requirements.filter((r) => r.status === "contacted").length;
  const closedCount = requirements.filter((r) => r.status === "closed").length;

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-text-primary flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
              <MessageSquare className="w-6 h-6" />
            </div>
            Buyer Requirements & Messages
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Real-time inquiries and custom requirements submitted by buyers on the portal.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => setStatusFilter("new")}
          className={cn(
            "p-5 rounded-2xl border transition-all cursor-pointer shadow-xs",
            statusFilter === "new"
              ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-bg-card border-border-default hover:border-amber-500/40"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-500">
              New Inquiries
            </span>
            <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-500">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-text-primary mt-2">
            {newCount}
          </div>
          <p className="text-xs text-text-secondary mt-1">Needs attention</p>
        </div>

        <div 
          onClick={() => setStatusFilter("contacted")}
          className={cn(
            "p-5 rounded-2xl border transition-all cursor-pointer shadow-xs",
            statusFilter === "contacted"
              ? "bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20"
              : "bg-bg-card border-border-default hover:border-blue-500/40"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-blue-400">
              Contacted / In Progress
            </span>
            <span className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
              <Send className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-text-primary mt-2">
            {contactedCount}
          </div>
          <p className="text-xs text-text-secondary mt-1">Connected on WhatsApp/Call</p>
        </div>

        <div 
          onClick={() => setStatusFilter("closed")}
          className={cn(
            "p-5 rounded-2xl border transition-all cursor-pointer shadow-xs",
            statusFilter === "closed"
              ? "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20"
              : "bg-bg-card border-border-default hover:border-emerald-500/40"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
              Closed / Completed
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-text-primary mt-2">
            {closedCount}
          </div>
          <p className="text-xs text-text-secondary mt-1">Matched or finished</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-bg-card p-3 rounded-2xl border border-border-default shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by buyer name, phone, city..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
          {(["all", "new", "contacted", "closed"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer shrink-0",
                statusFilter === st
                  ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
              )}
            >
              {st} {st === "all" ? `(${requirements.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Requirements List */}
      {filteredRequirements.length === 0 ? (
        <div className="text-center py-16 bg-bg-card border border-border-default rounded-3xl space-y-3">
          <MessageSquare className="w-12 h-12 text-slate-400 mx-auto opacity-40" />
          <h3 className="text-lg font-bold text-text-primary">No buyer requirements found</h3>
          <p className="text-xs text-text-secondary">
            {searchQuery ? "Try a different search query." : "Buyer submissions will show up here automatically."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequirements.map((req) => {
            const formattedDate = new Date(req.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const whatsappUrl = `https://wa.me/91${req.phone}?text=${encodeURIComponent(
              `Hi ${req.name}, greetings from Road Facing! We received your requirement for ${req.propertyType} in ${req.location} (${req.budget}). We have verified properties that match your preference.`
            )}`;

            return (
              <div
                key={req.id}
                className={cn(
                  "bg-bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 space-y-4",
                  req.status === "new"
                    ? "border-amber-500/50 bg-amber-500/[0.02]"
                    : "border-border-default"
                )}
              >
                {/* Header Row: Buyer Info & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 font-black flex items-center justify-center text-sm uppercase shrink-0">
                      {req.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-text-primary">{req.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-900 text-amber-400 border border-amber-400/30">
                          {req.purpose}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary mt-0.5">
                        <span className="font-bold text-text-primary">📞 +91 {req.phone}</span>
                        {req.email && <span>📧 {req.email}</span>}
                        <span>🕒 {formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      value={req.status}
                      onChange={(e) => updateStatus(req.id, e.target.value as any)}
                      className={cn(
                        "h-8 px-3 rounded-lg text-xs font-black outline-none border cursor-pointer",
                        req.status === "new"
                          ? "bg-amber-500 text-slate-950 border-amber-500"
                          : req.status === "contacted"
                            ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      )}
                    >
                      <option value="new" className="bg-bg-card text-text-primary">● New</option>
                      <option value="contacted" className="bg-bg-card text-text-primary">● Contacted</option>
                      <option value="closed" className="bg-bg-card text-text-primary">● Closed</option>
                    </select>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete requirement from ${req.name}?`)) {
                          deleteRequirement(req.id);
                        }
                      }}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Requirement Specifications Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-bg-surface p-3.5 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase font-extrabold block">Property Type</span>
                    <span className="font-bold text-text-primary">{req.propertyType}</span>
                    {req.bhk && <span className="text-text-secondary text-[11px]"> ({req.bhk})</span>}
                  </div>

                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase font-extrabold block">Preferred Location</span>
                    <span className="font-bold text-text-primary flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-500" /> {req.location}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase font-extrabold block">Budget Range</span>
                    <span className="font-black text-amber-500">{req.budget}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase font-extrabold block">Timeline</span>
                    <span className="font-bold text-text-primary">{req.timeline || "Immediate"}</span>
                  </div>
                </div>

                {/* Specific Notes */}
                {req.notes && (
                  <div className="text-xs text-text-secondary bg-bg-surface/60 p-2.5 rounded-lg border border-border-default/50">
                    <strong className="text-text-primary">Buyer Notes: </strong> {req.notes}
                  </div>
                )}

                {/* Direct Action Buttons (WhatsApp & Call) */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => updateStatus(req.id, "contacted")}
                    className="inline-flex items-center gap-2 h-8 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all hover:scale-105"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Chat on WhatsApp</span>
                  </a>

                  <a
                    href={`tel:${req.phone}`}
                    className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-bg-surface hover:bg-bg-secondary border border-border-default text-text-primary font-bold text-xs rounded-xl transition-all"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-500" />
                    <span>Call +91 {req.phone}</span>
                  </a>

                  {req.email && (
                    <a
                      href={`mailto:${req.email}`}
                      className="inline-flex items-center gap-1.5 h-8 px-3 bg-bg-surface hover:bg-bg-secondary border border-border-default text-text-secondary hover:text-text-primary font-medium text-xs rounded-xl transition-all"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email</span>
                    </a>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
