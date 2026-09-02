"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { 
  Bot, 
  User, 
  Send, 
  Search, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Flame, 
  Heart, 
  ShieldCheck, 
  RefreshCw, 
  MessageSquare,
  ArrowLeft,
  Info,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";

interface Ticket {
  id: string;
  phone: string;
  user_name: string;
  user_id?: string;
  subject: string;
  last_message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  assigned_name?: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "agent" | "system";
  message: string;
  media_url?: string;
  intent?: string;
  created_at: string;
}

interface CustomerProfile {
  name: string;
  phone: string;
  leadScore: number;
  stage: string;
  purpose: string;
  budgetRange: string;
  timeline: string;
  interestedProject: string;
  lastSearch: any;
  agentMode: boolean;
}

interface AICopilot {
  buyerIntentSummary: string;
  likelyObjection: string;
  recommendedAction: string;
  suggestedResponses: string[];
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState({ urgentCount: 0, openCount: 0, inProgressCount: 0, resolvedCount: 0, totalTickets: 0 });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [conversations, setConversations] = useState<Message[]>([]);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [savedProperties, setSavedProperties] = useState<any[]>([]);
  const [aiCopilot, setAiCopilot] = useState<AICopilot | null>(null);

  // Mobile active screen: 'tickets' | 'chat' | 'crm'
  const [mobileScreen, setMobileScreen] = useState<"tickets" | "chat" | "crm">("tickets");

  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "in_progress" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevPhoneRef = useRef<string | null>(null);

  const loadData = useCallback(async (phoneToSelect?: string, isManual?: boolean) => {
    if (isManual) setIsRefreshing(true);
    try {
      const activePhone = phoneToSelect || selectedTicket?.phone;
      const url = activePhone ? `/api/admin/whatsapp/support?phone=${encodeURIComponent(activePhone)}` : "/api/admin/whatsapp/support";
      const res = await fetch(url);
      const json = await res.json();

      if (json.success) {
        setTickets(json.tickets || []);
        setStats(json.stats || { urgentCount: 0, openCount: 0, inProgressCount: 0, resolvedCount: 0, totalTickets: 0 });

        if (activePhone) {
          setConversations(json.conversations || []);
          setCustomerProfile(json.customerProfile || null);
          setSavedProperties(json.savedProperties || []);
          setAiCopilot(json.aiCopilot || null);
        } else if (json.tickets?.length > 0 && !selectedTicket) {
          // On desktop auto-select first ticket, on mobile keep in tickets list
          if (window.innerWidth >= 1024) {
            setSelectedTicket(json.tickets[0]);
            loadData(json.tickets[0].phone);
          }
        }
        if (isManual) toast.success("Support desk refreshed!");
      }
    } catch (err) {
      console.error(err);
      if (isManual) toast.error("Failed to refresh support desk");
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, [selectedTicket?.phone]);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => loadData(), 8000);
    return () => clearInterval(timer);
  }, [loadData]);

  // Scroll inner chat container strictly without affecting outer page scroll
  useEffect(() => {
    if (selectedTicket?.phone && selectedTicket.phone !== prevPhoneRef.current) {
      prevPhoneRef.current = selectedTicket.phone;
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  }, [selectedTicket?.phone, conversations]);

  const handleSelectTicket = (t: Ticket) => {
    setSelectedTicket(t);
    setMobileScreen("chat");
    loadData(t.phone);
  };

  const handleSendReply = async (customText?: string) => {
    const textToSend = customText || replyText;
    if (!textToSend.trim() || !selectedTicket || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/whatsapp/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_reply",
          phone: selectedTicket.phone,
          message: textToSend.trim(),
          ticketId: selectedTicket.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Reply sent via WhatsApp!");
        setReplyText("");
        loadData(selectedTicket.phone);
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 100);
      } else {
        toast.error(data.error || "Failed to send WhatsApp message");
      }
    } catch {
      toast.error("Network error sending reply");
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: "open" | "in_progress" | "resolved") => {
    if (!selectedTicket) return;
    
    // Optimistic local state update
    setSelectedTicket((prev) => prev ? { ...prev, status: newStatus } : null);
    setCustomerProfile((prev) => prev ? { ...prev, agentMode: newStatus !== "resolved" } : null);
    setTickets((prev) => prev.map((t) => t.phone === selectedTicket.phone ? { ...t, status: newStatus } : t));

    try {
      const res = await fetch("/api/admin/whatsapp/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_ticket_status",
          ticketId: selectedTicket.id,
          phone: selectedTicket.phone,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(newStatus === "resolved" ? "Ticket resolved! AI Concierge resumed." : `Ticket marked as ${newStatus}`);
        loadData(selectedTicket.phone);
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesFilter = filterStatus === "all" ? true : t.status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      t.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone.includes(searchQuery) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] w-full bg-slate-950 text-slate-100 antialiased overflow-hidden select-text">
      {/* Top Bar Stats */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-semibold text-white tracking-tight leading-tight">Support Desk & Live CRM</h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight hidden xs:block">Two-way WhatsApp live agent desk with AI Copilot</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => loadData(undefined, true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} /> 
            <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* 3-Pane Responsive Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0 relative">
        
        {/* PANE 1: Tickets & Filter Sidebar */}
        <div className={`w-full lg:w-72 lg:flex border-r border-slate-800/80 bg-slate-900/30 flex-col shrink-0 min-h-0 ${
          mobileScreen === "tickets" ? "flex" : "hidden lg:flex"
        }`}>
          {/* Status Tabs */}
          <div className="p-2.5 border-b border-slate-800/80 space-y-2 shrink-0">
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-lg text-[10px] font-medium text-slate-400">
              <button 
                onClick={() => setFilterStatus("all")}
                className={`py-1 rounded-md transition ${filterStatus === "all" ? "bg-slate-800 text-white font-semibold" : "hover:text-slate-200"}`}
              >
                All ({stats.totalTickets})
              </button>
              <button 
                onClick={() => setFilterStatus("open")}
                className={`py-1 rounded-md transition ${filterStatus === "open" ? "bg-amber-500/20 text-amber-300 font-semibold" : "hover:text-slate-200"}`}
              >
                Open ({stats.openCount})
              </button>
              <button 
                onClick={() => setFilterStatus("in_progress")}
                className={`py-1 rounded-md transition ${filterStatus === "in_progress" ? "bg-blue-500/20 text-blue-300 font-semibold" : "hover:text-slate-200"}`}
              >
                Active ({stats.inProgressCount})
              </button>
              <button 
                onClick={() => setFilterStatus("resolved")}
                className={`py-1 rounded-md transition ${filterStatus === "resolved" ? "bg-emerald-500/20 text-emerald-300 font-semibold" : "hover:text-slate-200"}`}
              >
                Done ({stats.resolvedCount})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text"
                placeholder="Search name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Ticket List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 min-h-0">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <MessageSquare className="w-6 h-6 mx-auto mb-2 text-slate-600 opacity-50" />
                No inquiries in this tab
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = selectedTicket?.phone === t.phone;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTicket(t)}
                    className={`w-full text-left p-3 transition flex items-center justify-between gap-2 ${
                      isSelected ? "bg-amber-500/10 border-l-2 border-amber-500" : "hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-semibold text-white truncate">{t.user_name}</span>
                        <span className="text-[10px] text-slate-500 shrink-0">{new Date(t.updated_at || t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{t.last_message || t.subject}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider ${
                          t.status === "in_progress" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                          t.status === "resolved" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                          "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}>
                          {t.status.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">+{t.phone}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 lg:hidden shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* PANE 2: Visual Conversation Thread & Agent Tools */}
        <div className={`w-full lg:flex-1 lg:flex flex-col bg-slate-950 border-r border-slate-800/80 min-h-0 ${
          mobileScreen === "chat" ? "flex" : "hidden lg:flex"
        }`}>
          {selectedTicket ? (
            <>
              {/* Active Ticket Header */}
              <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 border-b border-slate-800/80 bg-slate-900/40 shrink-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileScreen("tickets")}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 lg:hidden shrink-0"
                    aria-label="Back to tickets list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-amber-400 border border-slate-700 text-xs shrink-0">
                    {selectedTicket.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <h2 className="text-xs font-semibold text-white truncate">{selectedTicket.user_name}</h2>
                      <span className="text-[10px] text-slate-400 font-mono hidden xs:inline">+{selectedTicket.phone}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <span className="capitalize">{selectedTicket.status.replace("_", " ")}</span>
                      <span>•</span>
                      <span className={customerProfile?.agentMode ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                        {customerProfile?.agentMode ? "Agent Live" : "AI Mode"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Mobile CRM Toggle Button */}
                  <button
                    onClick={() => setMobileScreen("crm")}
                    className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-800/40 text-indigo-300 hover:bg-indigo-900 lg:hidden text-xs flex items-center gap-1"
                    title="View Buyer CRM Details"
                  >
                    <Info className="w-3.5 h-3.5" /> <span className="text-[11px] font-semibold">CRM</span>
                  </button>

                  {selectedTicket.status !== "resolved" ? (
                    <button
                      onClick={() => handleUpdateStatus("resolved")}
                      className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Mark</span> Resolved
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus("in_progress")}
                      className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition whitespace-nowrap"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Message Thread Visualizer */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-0">
                {conversations.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                    <Clock className="w-6 h-6 mb-2 opacity-40" />
                    No message history loaded for this contact.
                  </div>
                ) : (
                  conversations.map((msg, i) => {
                    const isUser = msg.role === "user";
                    const isAI = msg.role === "assistant";
                    const isAgent = msg.role === "agent";

                    return (
                      <div key={msg.id || i} className={`flex flex-col ${isUser ? "items-start" : "items-end"}`}>
                        <div className="flex items-center gap-1.5 mb-0.5 px-1">
                          {isUser ? (
                            <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" /> {selectedTicket.user_name}
                            </span>
                          ) : isAI ? (
                            <span className="text-[10px] font-semibold text-indigo-400 flex items-center gap-1">
                              <Bot className="w-3 h-3" /> ROAD AI
                            </span>
                          ) : isAgent ? (
                            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Staff Advisor
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">System Notification</span>
                          )}
                          <span className="text-[10px] text-slate-600">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${
                          isUser ? "bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700/50" :
                          isAI ? "bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-800/40 text-indigo-100 rounded-tr-sm" :
                          isAgent ? "bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-800/40 text-emerald-100 rounded-tr-sm" :
                          "bg-slate-900 text-slate-400 border border-slate-800 italic"
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Agent Quick Insert Tools */}
              <div className="px-3 sm:px-4 py-1.5 border-t border-slate-800/60 bg-slate-900/30 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0 no-scrollbar">
                <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider shrink-0">Quick:</span>
                <button
                  onClick={() => setReplyText("Hello! I am reviewing verified availability in your budget right now. What is your preferred move-in date?")}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition whitespace-nowrap text-[10px] sm:text-[11px]"
                >
                  💰 Ask Timeline
                </button>
                <button
                  onClick={() => setReplyText("Would you like me to schedule a private on-site inspection for you this weekend?")}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition whitespace-nowrap text-[10px] sm:text-[11px]"
                >
                  📅 Offer Site Visit
                </button>
                <button
                  onClick={() => setReplyText("Here is the verified brochure and master floor plan for the project: https://roadd-three.vercel.app/projects")}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition whitespace-nowrap text-[10px] sm:text-[11px]"
                >
                  📄 Send Brochure
                </button>
              </div>

              {/* Live WhatsApp Composer */}
              <div className="p-2.5 sm:p-3 border-t border-slate-800 bg-slate-900/60 shrink-0">
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder={`Reply to ${selectedTicket.user_name} on WhatsApp...`}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 sm:p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
                  />
                  <button
                    onClick={() => handleSendReply()}
                    disabled={!replyText.trim() || sending}
                    className="px-3.5 sm:px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-1 text-xs shadow-md shadow-amber-500/10 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Send</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs p-6 text-center">
              <Bot className="w-10 h-10 mb-2 text-slate-600 opacity-40" />
              Select an inquiry thread from the left to view messages and reply.
            </div>
          )}
        </div>

        {/* PANE 3: Customer CRM Profile & Silent AI Copilot */}
        <div className={`w-full lg:w-80 lg:flex border-l border-slate-800/80 bg-slate-900/40 flex-col overflow-y-auto divide-y divide-slate-800/80 shrink-0 min-h-0 ${
          mobileScreen === "crm" ? "flex" : "hidden lg:flex"
        }`}>
          {customerProfile ? (
            <>
              {/* Mobile Back to Chat Bar */}
              <div className="p-3 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between lg:hidden">
                <button
                  onClick={() => setMobileScreen("chat")}
                  className="flex items-center gap-1 text-xs font-semibold text-amber-400"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Conversation
                </button>
                <span className="text-xs font-bold text-white">{customerProfile.name}</span>
              </div>

              {/* Buyer CRM Card */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Buyer CRM Profile</h3>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[11px] font-bold">
                    <Flame className="w-3 h-3" /> Score: {customerProfile.leadScore}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Stage:</span>
                    <span className="font-semibold text-white uppercase">{customerProfile.stage}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Budget:</span>
                    <span className="font-semibold text-amber-400">{customerProfile.budgetRange}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Purpose:</span>
                    <span className="font-semibold text-white capitalize">{customerProfile.purpose.replace("_", " ")}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Timeline:</span>
                    <span className="font-semibold text-white capitalize">{customerProfile.timeline.replace("_", " ")}</span>
                  </div>
                </div>
              </div>

              {/* Silent AI Copilot for Human Agents */}
              {aiCopilot && (
                <div className="p-4 space-y-2.5 bg-gradient-to-b from-indigo-950/30 to-slate-950/50">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5" /> AI AGENT COPILOT
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-800/30">
                      <span className="font-semibold text-indigo-300 block mb-0.5">Intent Summary:</span>
                      <span className="text-slate-300">{aiCopilot.buyerIntentSummary}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="font-semibold text-amber-400 block mb-0.5">Recommended Action:</span>
                      <span className="text-slate-300">{aiCopilot.recommendedAction}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Suggested Quick Replies:</span>
                    {aiCopilot.suggestedResponses.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setReplyText(sug);
                          setMobileScreen("chat");
                        }}
                        className="w-full text-left p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-300 transition border border-slate-800/80 hover:border-slate-700"
                      >
                        &quot;{sug}&quot;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved Properties */}
              <div className="p-4 space-y-2.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Heart className="w-3 h-3 text-rose-400" /> Saved Properties ({savedProperties.length})
                </h4>

                {savedProperties.length === 0 ? (
                  <p className="text-[11px] text-slate-500">No properties saved yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {savedProperties.map((sp) => (
                      <div key={sp.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                        <div className="font-semibold text-white truncate">{sp.title}</div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
                          <span>{sp.location_text || "Vijayawada"}</span>
                          <span className="text-amber-400 font-semibold">{sp.price_text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              No customer profile selected.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
