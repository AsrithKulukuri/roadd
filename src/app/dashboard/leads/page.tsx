"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useProjectsStore } from "@/stores/projects-store";
import {
  Users,
  Download,
  Phone,
  MessageSquare,
  Building,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";

interface LeadItem {
  id: string;
  project_id: string;
  project_slug: string;
  project_name: string;
  project_ref_id: string;
  builder_phone: string;
  viewer_name: string;
  viewer_phone: string;
  viewer_email: string;
  delivery_status: string;
  created_at: string;
}

export default function BuilderLeadsPage() {
  const { user, isLoggedIn, isLoading: isAuthLoading } = useAuthSession();
  const projects = useProjectsStore((state) => state.projects);
  const fetchProjects = useProjectsStore((state) => state.fetchProjects);

  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const userCleanPhone = useMemo(() => {
    return user?.phone ? formatWhatsAppPhone(user.phone) : "";
  }, [user?.phone]);

  const isAdmin = user?.role === "admin" || user?.email === "admin@road.com";

  // Filter projects associated with this builder (or all if admin)
  const myProjects = useMemo(() => {
    if (isAdmin) return projects;
    if (!userCleanPhone) return [];
    return projects.filter((p: any) => {
      const bPhone = formatWhatsAppPhone(p.builderPhone || p.builderWhatsapp || p.builder?.phone || p.builder?.whatsapp || "");
      return bPhone === userCleanPhone;
    });
  }, [projects, isAdmin, userCleanPhone]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchLeads = async () => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    try {
      let url = "/api/projects/leads/list";
      const params = new URLSearchParams();
      if (selectedProjectId !== "all") {
        params.set("projectId", selectedProjectId);
      } else if (!isAdmin && myProjects.length > 0) {
        // Fetch for first project or pass projectSlug
        params.set("projectId", myProjects[0].id);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setLeads(data.leads || []);
      } else {
        toast.error(data.error || "Could not load leads");
      }
    } catch (err: any) {
      toast.error("Network error fetching leads");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && !isAuthLoading) {
      fetchLeads();
    }
  }, [isLoggedIn, isAuthLoading, selectedProjectId, myProjects.length]);

  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const q = searchQuery.toLowerCase();
    return leads.filter(
      (l) =>
        (l.viewer_name || "").toLowerCase().includes(q) ||
        (l.viewer_phone || "").includes(q) ||
        (l.project_name || "").toLowerCase().includes(q) ||
        (l.project_ref_id || "").toLowerCase().includes(q)
    );
  }, [leads, searchQuery]);

  const handleExport = () => {
    let exportUrl = "/api/projects/leads/export";
    const params = new URLSearchParams();
    if (selectedProjectId !== "all") {
      params.set("projectId", selectedProjectId);
    } else if (!isAdmin && myProjects.length > 0) {
      params.set("projectId", myProjects[0].id);
    }
    if (params.toString()) {
      exportUrl += `?${params.toString()}`;
    }
    window.open(exportUrl, "_blank");
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Project Buyer Leads</h1>
          </div>
          <p className="text-sm text-slate-400">
            Real-time verified buyers who clicked and explored your projects on ROAD.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeads}
            disabled={isLoading}
            className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-white gap-1.5 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={handleExport}
            disabled={leads.length === 0}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 rounded-xl shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV (Excel)</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Buyer Views</span>
          <div className="text-3xl font-black text-white mt-1">{leads.length}</div>
          <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Stored in Supabase
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Instant WhatsApp Alerts</span>
          <div className="text-3xl font-black text-amber-400 mt-1">
            {leads.filter((l) => l.delivery_status === "instant_sent" || l.delivery_status === "surge_batched").length}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> Dispatched to your WhatsApp
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Projects</span>
          <div className="text-3xl font-black text-white mt-1">{myProjects.length}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-amber-400" /> Linked to your builder profile
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by buyer name, phone, ref ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {myProjects.length > 1 && (
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 font-semibold"
          >
            <option value="all">All Projects ({myProjects.length})</option>
            {myProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Leads Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-sm font-semibold">Loading verified buyer leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Users className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-lg font-bold text-white">No Buyer Leads Found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md">
              When logged-in buyers click or explore your projects, their verified details will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-extrabold text-slate-400 tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Buyer Name</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Project</th>
                  <th className="px-6 py-4">Date & Time (IST)</th>
                  <th className="px-6 py-4">Alert Status</th>
                  <th className="px-6 py-4 text-right">Quick Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLeads.map((lead) => {
                  const dateObj = lead.created_at ? new Date(lead.created_at) : new Date();
                  const istTime = dateObj.toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    dateStyle: "medium",
                    timeStyle: "short",
                  });

                  return (
                    <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">
                        <div className="flex flex-col">
                          <span>{lead.viewer_name || "Interested Buyer"}</span>
                          {lead.viewer_email && lead.viewer_email !== "Not provided" && (
                            <span className="text-xs font-normal text-slate-400">{lead.viewer_email}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-amber-400">
                        {lead.viewer_phone || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{lead.project_name || "Project"}</span>
                          <span className="text-xs text-slate-400 font-mono">{lead.project_ref_id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{istTime}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {lead.delivery_status === "instant_sent" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> WhatsApp Sent
                          </span>
                        ) : lead.delivery_status === "surge_batched" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            ⚡ Surge Batched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            Logged in DB
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {lead.viewer_phone && (
                            <>
                              <a
                                href={`tel:${lead.viewer_phone}`}
                                title="Call Buyer"
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors inline-flex items-center"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={`https://wa.me/${formatWhatsAppPhone(lead.viewer_phone)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Chat on WhatsApp"
                                className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors inline-flex items-center"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
