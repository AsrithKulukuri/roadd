"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Search,
  Send,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  Mail,
  Loader2,
  RefreshCw,
  Sparkles,
  Bot,
  UserCheck,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SupportTicket {
  id: string;
  phone: string;
  user_name: string;
  user_id?: string;
  subject: string;
  last_message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  assigned_name?: string;
  resolution_note?: string;
  created_at: string;
  updated_at: string;
}

interface ConversationMessage {
  id: string;
  phone: string;
  user_name?: string;
  role: "user" | "assistant" | "agent" | "system";
  message: string;
  media_url?: string;
  intent?: string;
  created_at: string;
}

interface SupportStats {
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  totalTickets: number;
}

const QUICK_REPLIES = [
  "Hello! I am reviewing the best property options matching your requirement right now.",
  "Would you like to schedule a site visit to this project this weekend?",
  "I have verified the RERA documents and pricing with the builder. Everything is clear.",
  "Our senior property advisor will give you a brief call in 10 minutes.",
];

export default function AdminSupportDeskPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportStats>({
    openCount: 0,
    inProgressCount: 0,
    resolvedCount: 0,
    totalTickets: 0,
  });
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [conversations, setConversations] = useState<ConversationMessage[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "open" | "in_progress" | "resolved">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const fetchSupportData = useCallback(async (phoneToSelect?: string) => {
    try {
      const res = await fetch(`/api/admin/whatsapp/support${phoneToSelect ? `?phone=${encodeURIComponent(phoneToSelect)}` : ""}`);
      const data = await res.json();

      if (data.success) {
        setTickets(data.tickets || []);
        if (data.stats) setStats(data.stats);
        if (data.conversations) setConversations(data.conversations);

        // If a ticket is selected, refresh its reference
        if (phoneToSelect) {
          const matched = (data.tickets || []).find((t: SupportTicket) => t.phone === phoneToSelect);
          if (matched) setSelectedTicket(matched);
        } else if (!selectedTicket && data.tickets?.length > 0) {
          const first = data.tickets[0];
          setSelectedTicket(first);
          fetchConversations(first.phone);
        }
      }
    } catch (err) {
      console.error("Failed to load support data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTicket]);

  const fetchConversations = async (phone: string) => {
    try {
      const res = await fetch(`/api/admin/whatsapp/support?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error("Failed to fetch conversation thread:", err);
    }
  };

  useEffect(() => {
    fetchSupportData();
    const interval = setInterval(() => {
      if (selectedTicket?.phone) {
        fetchConversations(selectedTicket.phone);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations]);

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    fetchConversations(ticket.phone);
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTicket || !replyText.trim() || isSending) return;

    const textToSend = replyText.trim();
    setIsSending(true);

    // Optimistic UI update
    const optimisticMsg: ConversationMessage = {
      id: `temp-${Date.now()}`,
      phone: selectedTicket.phone,
      user_name: "Admin",
      role: "agent",
      message: textToSend,
      created_at: new Date().toISOString(),
    };
    setConversations((prev) => [...prev, optimisticMsg]);
    setReplyText("");

    try {
      const res = await fetch("/api/admin/whatsapp/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_reply",
          phone: selectedTicket.phone,
          message: textToSend,
          ticketId: selectedTicket.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("WhatsApp message delivered!");
        fetchSupportData(selectedTicket.phone);
      } else {
        toast.error(data.error || "Failed to send WhatsApp message");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error sending WhatsApp reply");
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: SupportTicket["status"]) => {
    if (!selectedTicket || isUpdatingStatus) return;
    setIsUpdatingStatus(true);

    try {
      const res = await fetch("/api/admin/whatsapp/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_ticket_status",
          ticketId: selectedTicket.id,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Ticket marked as ${newStatus.replace("_", " ")}`);
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
        fetchSupportData(selectedTicket.phone);
      } else {
        toast.error(data.error || "Failed to update ticket status");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error updating status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (activeTab === "open" && t.status !== "open") return false;
    if (activeTab === "in_progress" && t.status !== "in_progress") return false;
    if (activeTab === "resolved" && t.status !== "resolved" && t.status !== "closed") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.user_name.toLowerCase().includes(q) ||
        t.phone.includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.last_message && t.last_message.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-text-primary tracking-tight">
              WhatsApp Support & Concierge Desk
            </h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Bot Active
            </span>
          </div>
          <p className="text-text-secondary text-sm mt-1">
            Real-time AI concierge monitoring, buyer requirement matching, and direct agent WhatsApp messaging.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsLoading(true);
            fetchSupportData(selectedTicket?.phone);
          }}
          disabled={isLoading}
          className="gap-2 shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} /> Refresh Feed
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-bg-card border border-border-default shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-text-tertiary uppercase">Open Inquiries</div>
            <div className="text-2xl font-bold font-heading text-amber-500 mt-1">{stats.openCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-bg-card border border-border-default shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-text-tertiary uppercase">In Progress</div>
            <div className="text-2xl font-bold font-heading text-blue-500 mt-1">{stats.inProgressCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-bg-card border border-border-default shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-text-tertiary uppercase">Resolved Today</div>
            <div className="text-2xl font-bold font-heading text-emerald-500 mt-1">{stats.resolvedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-bg-card border border-border-default shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-text-tertiary uppercase">Total Queries</div>
            <div className="text-2xl font-bold font-heading text-text-primary mt-1">{stats.totalTickets}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Two-Pane Support Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px] items-start">
        {/* Left Column: Ticket List (5 cols) */}
        <div className="lg:col-span-5 bg-bg-card border border-border-default rounded-3xl overflow-hidden shadow-elevated flex flex-col h-[700px]">
          {/* Tabs & Search */}
          <div className="p-4 border-b border-border-default space-y-3 bg-bg-primary/40">
            <div className="flex rounded-xl bg-bg-card border border-border-default p-1 text-xs font-semibold">
              {(["all", "open", "in_progress", "resolved"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg capitalize transition-all",
                    activeTab === tab
                      ? "bg-navy-primary text-white shadow-xs"
                      : "text-text-tertiary hover:text-text-primary"
                  )}
                >
                  {tab.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-text-tertiary" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search queries by name or phone..."
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-border-default bg-bg-card text-xs outline-none focus:border-amber-primary transition-colors"
              />
            </div>
          </div>

          {/* Ticket Items Feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">
            {isLoading ? (
              <div className="p-12 text-center text-text-tertiary">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-primary" />
                Loading inquiries...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-12 text-center text-text-tertiary space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-text-tertiary opacity-50" />
                <p className="text-xs">No support tickets found in this tab.</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => handleSelectTicket(ticket)}
                    className={cn(
                      "w-full text-left p-4 transition-all hover:bg-bg-primary/50 flex items-start gap-3 relative",
                      isSelected && "bg-amber-primary/5 border-l-4 border-l-amber-primary"
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-primary/10 flex items-center justify-center text-amber-primary font-bold font-heading shrink-0 text-sm">
                      {(ticket.user_name || "U").charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-text-primary truncate">
                          {ticket.user_name}
                        </span>
                        <span className="text-[0.68rem] text-text-tertiary shrink-0">
                          {new Date(ticket.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className="text-xs text-text-secondary line-clamp-1 mt-0.5 font-medium">
                        {ticket.subject}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[0.625rem] font-bold uppercase",
                            ticket.status === "open"
                              ? "bg-amber-500/15 text-amber-500"
                              : ticket.status === "in_progress"
                              ? "bg-blue-500/15 text-blue-500"
                              : "bg-emerald-500/15 text-emerald-600"
                          )}
                        >
                          {ticket.status.replace("_", " ")}
                        </span>

                        {ticket.priority === "high" || ticket.priority === "urgent" ? (
                          <span className="px-1.5 py-0.5 rounded text-[0.625rem] font-bold bg-red-500/10 text-red-600">
                            High Priority
                          </span>
                        ) : null}

                        <span className="text-[0.68rem] text-text-tertiary truncate">
                          📱 {ticket.phone}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation Console (7 cols) */}
        <div className="lg:col-span-7 bg-bg-card border border-border-default rounded-3xl overflow-hidden shadow-elevated flex flex-col h-[700px]">
          {selectedTicket ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-border-default bg-bg-primary/40 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold font-heading shrink-0">
                    {(selectedTicket.user_name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-text-primary flex items-center gap-2 truncate">
                      <span className="truncate">{selectedTicket.user_name}</span>
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-emerald-500/15 text-emerald-600">
                        <ShieldCheck className="w-3 h-3" /> Verified Member
                      </span>
                    </div>
                    <div className="text-xs text-text-tertiary flex items-center gap-2 mt-0.5 truncate">
                      <span className="flex items-center gap-1">
                        <Smartphone className="w-3 h-3" /> {selectedTicket.phone}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Dropdown Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {selectedTicket.status !== "resolved" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus("resolved")}
                      disabled={isUpdatingStatus}
                      className="h-8 text-xs font-semibold gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus("in_progress")}
                      disabled={isUpdatingStatus}
                      className="h-8 text-xs font-semibold gap-1"
                    >
                      Reopen Ticket
                    </Button>
                  )}
                </div>
              </div>

              {/* Chat Thread Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-bg-primary/20">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-text-tertiary">
                    <Bot className="w-8 h-8 mx-auto mb-2 text-amber-primary opacity-60" />
                    <p className="text-xs">No WhatsApp chat history recorded yet for this number.</p>
                  </div>
                ) : (
                  conversations.map((msg) => {
                    const isUser = msg.role === "user";
                    const isAI = msg.role === "assistant";
                    const isAgent = msg.role === "agent";
                    const isSystem = msg.role === "system";

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs space-y-1.5",
                          isUser
                            ? "self-start bg-bg-card border border-border-default text-text-primary rounded-tl-sm"
                            : isAgent
                            ? "self-end bg-navy-primary text-white rounded-tr-sm"
                            : isAI
                            ? "self-end bg-amber-500/10 border border-amber-500/20 text-text-primary rounded-tr-sm"
                            : "self-center bg-slate-500/10 text-text-secondary text-center max-w-[90%]"
                        )}
                      >
                        {/* Sender Label */}
                        <div
                          className={cn(
                            "flex items-center gap-1 font-bold text-[0.68rem]",
                            isUser
                              ? "text-emerald-600"
                              : isAgent
                              ? "text-amber-400"
                              : isAI
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-text-tertiary justify-center"
                          )}
                        >
                          {isUser ? (
                            <>
                              <User className="w-3 h-3" /> {msg.user_name || "User"}
                            </>
                          ) : isAgent ? (
                            <>
                              <ShieldAlert className="w-3 h-3" /> ROAD Property Advisor
                            </>
                          ) : isAI ? (
                            <>
                              <Sparkles className="w-3 h-3" /> ROAD AI Concierge
                            </>
                          ) : (
                            <>
                              <HelpCircle className="w-3 h-3" /> System Notice
                            </>
                          )}
                        </div>

                        {/* Message Body */}
                        <p className="whitespace-pre-line break-words">{msg.message}</p>

                        {/* Timestamp */}
                        <div
                          className={cn(
                            "text-[0.625rem] self-end pt-1",
                            isAgent ? "text-white/60" : "text-text-tertiary"
                          )}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Quick Reply Chips */}
              <div className="px-4 py-2 border-t border-border-subtle bg-bg-card overflow-x-auto flex gap-2 shrink-0">
                {QUICK_REPLIES.map((reply, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyText(reply)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-bg-primary text-[0.68rem] text-text-secondary hover:text-text-primary border border-border-default hover:border-amber-primary transition-colors truncate max-w-[240px]"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Reply Box Composer */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-border-default bg-bg-card flex items-end gap-2 shrink-0">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  rows={2}
                  placeholder={`Send live WhatsApp reply to ${selectedTicket.user_name}... (Enter to send)`}
                  className="flex-1 resize-none rounded-xl border border-border-default bg-bg-primary p-2.5 text-xs outline-none focus:border-amber-primary leading-relaxed"
                />

                <Button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="h-10 px-4 rounded-xl gap-1.5 shrink-0 bg-amber-primary text-black font-semibold hover:bg-amber-secondary"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-text-tertiary space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-primary/10 flex items-center justify-center text-amber-primary">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-base">Select a conversation</h3>
                <p className="text-xs text-text-secondary mt-1">
                  Choose an inquiry from the left panel to inspect the WhatsApp thread and send direct agent replies.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
