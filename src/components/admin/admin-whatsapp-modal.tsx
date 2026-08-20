"use client";

import { useState } from "react";
import { formatWhatsAppPropertyMessage, shareOnWhatsApp } from "@/lib/whatsapp/whatsapp-share";
import { WhatsAppIcon } from "@/components/property/whatsapp-share-button";
import { X, Send, Copy, Check, ExternalLink, Loader2, AlertCircle, Sparkles, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatPriceCompact } from "@/lib/utils";
import { getRefId } from "@/lib/ref-id";

interface AdminWhatsAppModalProps {
  item: any;
  type?: "property" | "project";
  isOpen: boolean;
  onClose: () => void;
}

export function AdminWhatsAppModal({
  item,
  type = "property",
  isOpen,
  onClose,
}: AdminWhatsAppModalProps) {
  const [recipientPhone, setRecipientPhone] = useState("");
  const [sendMode, setSendMode] = useState<"template" | "custom_message">("template");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  if (!isOpen || !item) return null;

  const { text, url, refId, title } = formatWhatsAppPropertyMessage(item, type);
  const imageUrl = item.coverImage || item.images?.[0]?.url || "";

  const handleCopyMessage = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("WhatsApp property message copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleManualShare = () => {
    shareOnWhatsApp({ item, type, recipientPhone, source: "admin" });
  };

  const handleCloudApiSend = async () => {
    if (!recipientPhone.trim()) {
      toast.error("Please enter a recipient phone number");
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    try {
      const res = await fetch("/api/whatsapp/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: type === "property" ? item.id : undefined,
          projectId: type === "project" ? item.id : undefined,
          recipientPhone,
          mode: sendMode,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus("failed");
        setErrorMessage(data.error || "Failed to send WhatsApp message");
        toast.error(data.error || "Failed to send via Business API");
        return;
      }

      setStatus("sent");
      toast.success(
        data.mode === "simulated"
          ? "WhatsApp message payload generated! (Live API ready)"
          : `Sent to ${data.recipient}!`
      );
    } catch (err: any) {
      setStatus("failed");
      setErrorMessage(err?.message || "Network error sending WhatsApp message");
      toast.error("Network error sending WhatsApp message");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-bg-card border border-border-default rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-bg-primary/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <WhatsAppIcon className="w-5 h-5 fill-emerald-500/20" />
            </div>
            <div>
              <h3 className="font-bold text-base text-text-primary">Share on WhatsApp</h3>
              <p className="text-xs text-text-tertiary">
                {refId} • {title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-bg-subtle text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Card Live Preview */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> WhatsApp Card Preview
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {refId}
              </span>
            </div>

            {/* Thumbnail + Details */}
            <div className="flex gap-3 bg-bg-card/90 border border-border-subtle rounded-xl p-3">
              {imageUrl && (
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-bg-primary shrink-0">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0 text-xs space-y-1">
                <h4 className="font-bold text-text-primary text-sm truncate">{title}</h4>
                <p className="text-amber-primary font-black">
                  {typeof item.price === "number" ? formatPriceCompact(item.price) : "Price on Request"}
                </p>
                <p className="text-text-tertiary truncate">
                  📍 {item.location?.locality || ""}, {item.location?.city || "AP"}
                </p>
              </div>
            </div>

            {/* Message Text preview */}
            <div className="bg-bg-primary/80 border border-border-subtle rounded-xl p-3 text-xs text-text-secondary font-mono whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
              {text}
            </div>
          </div>

          {/* Business API Direct Send Form */}
          <div className="space-y-3 bg-bg-subtle/50 p-4 rounded-2xl border border-border-subtle">
            <label className="block text-xs font-bold text-text-primary uppercase tracking-wider">
              Send to Contact / Lead Phone Number
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="e.g. 9876543210 or 919876543210"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-bg-card border border-border-default text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-amber-primary"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleManualShare}
                className="gap-1.5 shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" /> Open Chat
              </Button>
            </div>
          </div>

          {/* Status Feedback */}
          {status === "sending" && (
            <div className="flex items-center gap-2 text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending WhatsApp Business API message...</span>
            </div>
          )}

          {status === "sent" && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
              <span>Message dispatched successfully to {recipientPhone}!</span>
            </div>
          )}

          {status === "failed" && (
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMessage || "Failed to send message. Please retry."}</span>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-border-default bg-bg-primary/50 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCopyMessage}
            className="gap-2 text-xs text-text-secondary hover:text-text-primary cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Text"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleManualShare}
              className="gap-2 text-xs border-border-default hover:border-text-primary cursor-pointer"
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
              Manual Share
            </Button>

            <Button
              type="button"
              disabled={status === "sending" || !recipientPhone.trim()}
              onClick={handleCloudApiSend}
              className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
            >
              {status === "sending" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {status === "failed" ? "Retry Send" : "Send via Business API"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
