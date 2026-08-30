"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Phone, MessageSquare, Download, Users, ArrowLeft, Building2, Calendar, Mail, Search, RefreshCw, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface LeadItem {
  id: string;
  project_name: string;
  project_ref_id?: string;
  viewer_name: string;
  viewer_phone: string;
  viewer_email?: string;
  created_at: string;
  delivery_status?: string;
}

function LeadBookContent() {
  const searchParams = useSearchParams();
  const builderPhone = searchParams.get("builderPhone") || "";
  const projectSlug = searchParams.get("projectSlug") || "";
  const projectId = searchParams.get("projectId") || "";

  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (builderPhone) params.set("builderPhone", builderPhone);
      if (projectSlug) params.set("projectSlug", projectSlug);
      if (projectId) params.set("projectId", projectId);
      params.set("format", "json");

      const res = await fetch(`/api/projects/leads/list?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error("Failed to load leads:", err);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [builderPhone, projectSlug, projectId]);

  const filteredLeads = leads.filter((l) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (l.viewer_name || "").toLowerCase().includes(q) ||
      (l.viewer_phone || "").includes(q) ||
      (l.project_name || "").toLowerCase().includes(q) ||
      (l.viewer_email || "").toLowerCase().includes(q)
    );
  });

  const projectName = leads[0]?.project_name || "All Projects";

  const exportUrl = `/api/projects/leads/export?${new URLSearchParams({
    ...(builderPhone ? { builderPhone } : {}),
    ...(projectSlug ? { projectSlug } : {}),
    ...(projectId ? { projectId } : {}),
  }).toString()}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-base font-bold text-white leading-tight">Live Buyer Leads</h1>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[200px] sm:max-w-md">
                {projectName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <a
              href={exportUrl}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/40 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel Export</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-4">
        {/* Quick Stats Banner */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800/80 rounded-2xl p-4 mb-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">
                  {leads.length} <span className="text-sm font-normal text-slate-400">Verified Leads</span>
                </div>
                <div className="text-xs text-slate-400">
                  Updated: {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} IST
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
              🔒 Verified Direct Interest
            </div>
          </div>

          {/* Search Input */}
          <div className="mt-4 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by buyer name, phone number, or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Leads List */}
        {loading && leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
            <p className="text-sm">Loading verified buyer leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No leads found</p>
            <p className="text-xs mt-1 text-slate-500">
              {searchQuery ? "Try a different search query" : "New leads will appear here in real time as buyers explore your project."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map((lead, idx) => {
              const dateObj = lead.created_at ? new Date(lead.created_at) : new Date();
              const formattedTime = dateObj.toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              const cleanPhone = lead.viewer_phone.replace(/\D/g, "");
              const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                `Hello ${lead.viewer_name || ""}, thank you for exploring ${lead.project_name || "our project"} on ROAD FACING. Would you like to schedule a site visit or get floor plans?`
              )}`;

              return (
                <div
                  key={lead.id || idx}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all duration-200 shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          #{filteredLeads.length - idx}
                        </span>
                        <h3 className="font-bold text-white text-base">
                          {lead.viewer_name || "Interested Buyer"}
                        </h3>
                        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{lead.project_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formattedTime} IST</span>
                        </div>
                        {lead.viewer_email && lead.viewer_email !== "Not provided" && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span className="truncate max-w-[180px]">{lead.viewer_email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <a
                        href={`tel:${lead.viewer_phone}`}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Call</span>
                      </a>
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeadBookPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      }
    >
      <LeadBookContent />
    </Suspense>
  );
}
