"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  ImagePlus,
  Loader2,
  MessageSquareText,
  PauseCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Upload,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadToS3 } from "@/lib/aws/storage-utils";
import { cn } from "@/lib/utils";

type AudienceContact = {
  id: string;
  contactId?: string;
  name: string;
  email?: string;
  phone: string;
  maskedPhone: string;
  eligible: boolean;
  consentSource: string;
  optedInAt: string;
  optedOutAt: string;
};

type BroadcastContent = {
  id: string;
  kind: "property" | "project" | "banner";
  title: string;
  imageUrl: string;
  slug: string;
};

type Campaign = {
  id: string;
  name: string;
  status: "queued" | "sending" | "completed" | "completed_with_failures" | "cancelled";
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  media_kind: "none" | "image";
  created_at: string;
};

type ConsentTarget = {
  mode: "registered" | "resubscribe";
  id: string;
  name: string;
};

type AudienceResponse = {
  success?: boolean;
  error?: string;
  registeredUsers?: AudienceContact[];
  externalContacts?: AudienceContact[];
  content?: BroadcastContent[];
};

function campaignStatusLabel(status: Campaign["status"]): string {
  return status.replaceAll("_", " ");
}

function statusStyle(status: Campaign["status"]): string {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-600";
  if (status === "completed_with_failures") return "bg-red-500/10 text-red-600";
  if (status === "sending") return "bg-blue-500/10 text-blue-600";
  if (status === "cancelled") return "bg-slate-500/10 text-slate-600";
  return "bg-amber-500/10 text-amber-700";
}

export default function AdminBroadcastsPage() {
  const [registeredUsers, setRegisteredUsers] = useState<AudienceContact[]>([]);
  const [externalContacts, setExternalContacts] = useState<AudienceContact[]>([]);
  const [content, setContent] = useState<BroadcastContent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [audienceTab, setAudienceTab] = useState<"registered" | "external">("registered");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [processingCampaignId, setProcessingCampaignId] = useState<string | null>(null);
  const queueAbortRef = useRef(false);

  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [contentSelection, setContentSelection] = useState("custom:");
  const [customMediaUrl, setCustomMediaUrl] = useState("");
  const [customMediaName, setCustomMediaName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [externalName, setExternalName] = useState("");
  const [externalPhone, setExternalPhone] = useState("");
  const [externalSource, setExternalSource] = useState("");
  const [externalEvidence, setExternalEvidence] = useState("");
  const [externalConfirmed, setExternalConfirmed] = useState(false);

  const [consentTarget, setConsentTarget] = useState<ConsentTarget | null>(null);
  const [consentSource, setConsentSource] = useState("");
  const [consentEvidence, setConsentEvidence] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);

  const loadAudience = useCallback(async () => {
    const response = await fetch("/api/admin/whatsapp/audience", { cache: "no-store" });
    const result = (await response.json().catch(() => null)) as AudienceResponse | null;
    if (!response.ok || !result?.success) throw new Error(result?.error || "Could not load broadcast audience.");
    setRegisteredUsers(result.registeredUsers || []);
    setExternalContacts(result.externalContacts || []);
    setContent(result.content || []);
  }, []);

  const loadCampaigns = useCallback(async () => {
    const response = await fetch("/api/admin/whatsapp/campaigns", { cache: "no-store" });
    const result = (await response.json().catch(() => null)) as { success?: boolean; error?: string; campaigns?: Campaign[] } | null;
    if (!response.ok || !result?.success) throw new Error(result?.error || "Could not load campaigns.");
    setCampaigns(result.campaigns || []);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([loadAudience(), loadCampaigns()])
      .catch((error: unknown) => active && toast.error(error instanceof Error ? error.message : "Broadcast data could not be loaded."))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
      queueAbortRef.current = true;
    };
  }, [loadAudience, loadCampaigns]);

  const eligibleContacts = useMemo(() => {
    const merged = [
      ...registeredUsers.filter((item) => item.eligible && item.contactId).map((item) => ({ ...item, id: item.contactId! })),
      ...externalContacts.filter((item) => item.eligible),
    ];
    return Array.from(new Map(merged.map((contact) => [contact.id, contact])).values());
  }, [externalContacts, registeredUsers]);

  const visibleContacts = useMemo(() => {
    const source = audienceTab === "registered" ? registeredUsers : externalContacts;
    const query = search.trim().toLowerCase();
    if (!query) return source;
    return source.filter((contact) =>
      [contact.name, contact.email || "", contact.phone].some((value) => value.toLowerCase().includes(query))
    );
  }, [audienceTab, externalContacts, registeredUsers, search]);

  const tabEligibleContactIds = useMemo(
    () =>
      audienceTab === "registered"
        ? registeredUsers
            .filter((contact) => contact.eligible && contact.contactId)
            .map((contact) => contact.contactId!)
        : externalContacts.filter((contact) => contact.eligible).map((contact) => contact.id),
    [audienceTab, externalContacts, registeredUsers]
  );

  const allTabContactsSelected =
    tabEligibleContactIds.length > 0 && tabEligibleContactIds.every((id) => selectedContactIds.has(id));

  const selectedContent = useMemo(() => {
    const [kind, id] = contentSelection.split(":");
    return content.find((item) => item.kind === kind && item.id === id) || null;
  }, [content, contentSelection]);

  const selectedMediaUrl = selectedContent?.imageUrl || customMediaUrl;

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((current) => {
      const next = new Set(current);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  };

  const toggleAllEligible = () => {
    setSelectedContactIds((current) => {
      const next = new Set(current);
      if (allTabContactsSelected) tabEligibleContactIds.forEach((id) => next.delete(id));
      else tabEligibleContactIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const mutateContact = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/admin/whatsapp/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null;
    if (!response.ok || !result?.success) throw new Error(result?.error || "Contact could not be saved.");
  };

  const addExternalContact = async (event: FormEvent) => {
    event.preventDefault();
    if (!externalConfirmed) return toast.error("Confirm that this contact explicitly opted in.");
    setIsSubmitting(true);
    try {
      await mutateContact({
        action: "add_external",
        name: externalName,
        phone: externalPhone,
        consentSource: externalSource,
        consentEvidence: externalEvidence,
        consentConfirmed: true,
      });
      toast.success("External contact added to the opted-in audience.");
      setExternalName("");
      setExternalPhone("");
      setExternalSource("");
      setExternalEvidence("");
      setExternalConfirmed(false);
      setShowExternalForm(false);
      await loadAudience();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Contact could not be saved.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveConsent = async () => {
    if (!consentTarget || !consentConfirmed) return toast.error("Confirm that explicit consent was received.");
    setIsSubmitting(true);
    try {
      await mutateContact(
        consentTarget.mode === "registered"
          ? {
              action: "register_user_consent",
              profileId: consentTarget.id,
              consentSource,
              consentEvidence,
              consentConfirmed: true,
            }
          : {
              action: "resubscribe",
              contactId: consentTarget.id,
              consentSource,
              consentEvidence,
              consentConfirmed: true,
            }
      );
      toast.success("WhatsApp consent recorded.");
      setConsentTarget(null);
      setConsentSource("");
      setConsentEvidence("");
      setConsentConfirmed(false);
      await loadAudience();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Consent could not be saved.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const unsubscribeContact = async (contactId: string) => {
    try {
      await mutateContact({ action: "unsubscribe", contactId });
      setSelectedContactIds((current) => {
        const next = new Set(current);
        next.delete(contactId);
        return next;
      });
      toast.success("Contact removed from future broadcasts.");
      await loadAudience();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Contact could not be unsubscribed.");
    }
  };

  const uploadCustomMedia = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return toast.error("Use a JPEG or PNG image.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Wasender images must be 5MB or smaller.");
    setIsUploading(true);
    try {
      const result = await uploadToS3({ file, folder: "banners", compress: true, watermark: true });
      if (!result.success || !result.fileUrl) throw new Error(result.error || "Image upload failed.");
      setCustomMediaUrl(result.fileUrl);
      setCustomMediaName(file.name);
      setContentSelection("custom:");
      toast.success("Broadcast image uploaded.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const processCampaign = useCallback(
    async (campaignId: string) => {
      if (processingCampaignId) return;
      queueAbortRef.current = false;
      setProcessingCampaignId(campaignId);
      try {
        let pending = true;
        while (pending && !queueAbortRef.current) {
          const response = await fetch("/api/admin/whatsapp/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campaignId }),
          });
          const result = (await response.json().catch(() => null)) as { success?: boolean; error?: string; pending?: boolean; nextDelayMs?: number } | null;
          if (!response.ok || !result?.success) throw new Error(result?.error || "Broadcast queue stopped.");
          pending = Boolean(result.pending);
          await loadCampaigns();
          if (pending && !queueAbortRef.current) {
            const resumeAt = Date.now() + (result.nextDelayMs || 60000);
            while (!queueAbortRef.current && Date.now() < resumeAt) {
              await new Promise((resolve) => window.setTimeout(resolve, Math.min(250, resumeAt - Date.now())));
            }
          }
        }
        if (!queueAbortRef.current) toast.success("Broadcast queue finished.");
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Broadcast queue stopped.");
      } finally {
        setProcessingCampaignId(null);
      }
    },
    [loadCampaigns, processingCampaignId]
  );

  const createCampaign = async (event: FormEvent) => {
    event.preventDefault();
    if (selectedContactIds.size === 0) return toast.error("Select at least one opted-in contact.");
    setIsSubmitting(true);
    try {
      const [contentType, contentId] = contentSelection.split(":") as ["custom" | "property" | "project" | "banner", string];
      const response = await fetch("/api/admin/whatsapp/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          message,
          contentType,
          contentId: contentId || undefined,
          customMediaUrl: contentType === "custom" ? customMediaUrl || undefined : undefined,
          selectedContactIds: Array.from(selectedContactIds),
          selectAllEligible: false,
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        campaignId?: string;
        recipientCount?: number;
      } | null;
      if (!response.ok || !result?.success || !result.campaignId) {
        throw new Error(result?.error || "Campaign could not be created.");
      }
      toast.success(`Campaign queued for ${result.recipientCount || selectedContactIds.size} contacts.`);
      setCampaignName("");
      setMessage("");
      await loadCampaigns();
      void processCampaign(result.campaignId);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Campaign could not be created.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = selectedContactIds.size;
  const deliveredTotal = campaigns.reduce((sum, campaign) => sum + campaign.sent_count, 0);

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-6 lg:p-10">
      <header className="flex flex-col gap-4 border-b border-border-default pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-primary">
            <MessageSquareText className="h-4 w-4" /> Wasender broadcasts
          </div>
          <h1 className="font-heading text-2xl font-bold text-text-primary sm:text-3xl">WhatsApp Notifications</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Send new listings and visual updates to contacts with recorded WhatsApp consent.
          </p>
        </div>
        <Button type="button" onClick={() => setShowExternalForm((value) => !value)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Add external number
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Broadcast summary">
        {[
          { label: "Eligible audience", value: eligibleContacts.length, icon: ShieldCheck },
          { label: "Selected", value: selectedCount, icon: CheckCircle2 },
          { label: "Campaigns", value: campaigns.length, icon: MessageSquareText },
          { label: "Delivered", value: deliveredTotal, icon: Send },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-lg border border-border-default bg-bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase text-text-tertiary">{metric.label}</span>
                <Icon className="h-4 w-4 text-amber-primary" />
              </div>
              <div className="mt-2 text-2xl font-bold text-text-primary">{metric.value}</div>
            </div>
          );
        })}
      </section>

      {showExternalForm && (
        <form onSubmit={addExternalContact} className="grid gap-4 border-y border-border-default bg-bg-card py-6 lg:grid-cols-4">
          <label className="space-y-1.5 text-sm font-semibold text-text-primary">
            Contact name
            <input value={externalName} onChange={(event) => setExternalName(event.target.value)} required className="h-11 w-full rounded-lg border border-border-default bg-bg-primary px-3 outline-none focus:border-amber-primary" />
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-text-primary">
            WhatsApp number
            <input value={externalPhone} onChange={(event) => setExternalPhone(event.target.value)} placeholder="+91 98765 43210" required className="h-11 w-full rounded-lg border border-border-default bg-bg-primary px-3 outline-none focus:border-amber-primary" />
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-text-primary">
            Consent source
            <input value={externalSource} onChange={(event) => setExternalSource(event.target.value)} placeholder="Website form, event, signed form" required className="h-11 w-full rounded-lg border border-border-default bg-bg-primary px-3 outline-none focus:border-amber-primary" />
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-text-primary">
            Evidence or note
            <input value={externalEvidence} onChange={(event) => setExternalEvidence(event.target.value)} placeholder="Form ID or date" className="h-11 w-full rounded-lg border border-border-default bg-bg-primary px-3 outline-none focus:border-amber-primary" />
          </label>
          <label className="flex items-start gap-2 text-sm text-text-secondary lg:col-span-3">
            <Checkbox checked={externalConfirmed} onCheckedChange={(checked) => setExternalConfirmed(checked === true)} className="mt-0.5" />
            This person explicitly agreed to receive ROAD WhatsApp updates and the consent source above is accurate.
          </label>
          <Button type="submit" disabled={isSubmitting || !externalConfirmed} className="gap-2 lg:justify-self-end">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add contact
          </Button>
        </form>
      )}

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.6fr)]">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary">Audience</h2>
              <p className="text-sm text-text-secondary">Only active, opted-in contacts can be selected.</p>
            </div>
            <Button type="button" variant="outline" onClick={toggleAllEligible} className="gap-2">
              {allTabContactsSelected ? <XCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              {allTabContactsSelected
                ? `Clear ${audienceTab}`
                : `Select all ${audienceTab} (${tabEligibleContactIds.length})`}
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="inline-flex h-11 rounded-lg border border-border-default bg-bg-card p-1">
              <button type="button" onClick={() => setAudienceTab("registered")} className={cn("flex-1 rounded-md px-4 text-sm font-semibold sm:flex-none", audienceTab === "registered" ? "bg-navy-primary text-white" : "text-text-secondary")}>Registered ({registeredUsers.length})</button>
              <button type="button" onClick={() => setAudienceTab("external")} className={cn("flex-1 rounded-md px-4 text-sm font-semibold sm:flex-none", audienceTab === "external" ? "bg-navy-primary text-white" : "text-text-secondary")}>External ({externalContacts.length})</button>
            </div>
            <label className="relative flex-1">
              <span className="sr-only">Search audience</span>
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-text-tertiary" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, or number" className="h-11 w-full rounded-lg border border-border-default bg-bg-card pl-10 pr-3 outline-none focus:border-amber-primary" />
            </label>
          </div>

          <div className="overflow-hidden rounded-lg border border-border-default bg-bg-card">
            {isLoading ? (
              <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-primary" /></div>
            ) : visibleContacts.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center gap-2 text-text-secondary"><Users className="h-8 w-8" /><span>No contacts found.</span></div>
            ) : (
              <div className="max-h-[620px] divide-y divide-border-default overflow-y-auto">
                {visibleContacts.map((contact) => {
                  const selectableId = audienceTab === "registered" ? contact.contactId : contact.id;
                  const checked = Boolean(selectableId && selectedContactIds.has(selectableId));
                  return (
                    <div key={`${audienceTab}-${contact.id}`} className="flex gap-3 p-4 sm:items-center">
                      <Checkbox checked={checked} disabled={!contact.eligible || !selectableId} onCheckedChange={() => selectableId && toggleContact(selectableId)} className="mt-1 sm:mt-0" aria-label={`Select ${contact.name}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-semibold text-text-primary">{contact.name}</span>
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", contact.eligible ? "bg-emerald-500/10 text-emerald-600" : contact.optedOutAt ? "bg-red-500/10 text-red-600" : "bg-slate-500/10 text-text-tertiary")}>{contact.eligible ? "Opted in" : contact.optedOutAt ? "Opted out" : "Consent needed"}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                          <span className="flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" /> {contact.maskedPhone}</span>
                          {contact.email && <span className="truncate">{contact.email}</span>}
                          {contact.consentSource && <span>Source: {contact.consentSource}</span>}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {contact.eligible && selectableId ? (
                          <button type="button" onClick={() => unsubscribeContact(selectableId)} className="text-xs font-semibold text-red-600 hover:underline">Unsubscribe</button>
                        ) : contact.phone ? (
                          <button type="button" onClick={() => setConsentTarget({ mode: contact.optedOutAt && selectableId ? "resubscribe" : "registered", id: contact.optedOutAt && selectableId ? selectableId : contact.id, name: contact.name })} className="text-xs font-semibold text-amber-primary hover:underline">Record consent</button>
                        ) : (
                          <span className="text-xs text-text-tertiary">No number</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <form onSubmit={createCampaign} className="space-y-5 rounded-lg border border-border-default bg-bg-card p-5 shadow-xs xl:sticky xl:top-24">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Compose notification</h2>
            <p className="mt-1 text-sm text-text-secondary">{selectedCount} contact{selectedCount === 1 ? "" : "s"} selected</p>
          </div>

          <label className="block space-y-1.5 text-sm font-semibold text-text-primary">
            Campaign name
            <input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} required maxLength={120} placeholder="September new properties" className="h-11 w-full rounded-lg border border-border-default bg-bg-primary px-3 outline-none focus:border-amber-primary" />
          </label>

          <label className="block space-y-1.5 text-sm font-semibold text-text-primary">
            Property, project, or banner
            <select value={contentSelection} onChange={(event) => setContentSelection(event.target.value)} className="h-11 w-full rounded-lg border border-border-default bg-bg-primary px-3 outline-none focus:border-amber-primary">
              <option value="custom:">Custom message or uploaded image</option>
              <optgroup label="Properties">{content.filter((item) => item.kind === "property").map((item) => <option key={`property-${item.id}`} value={`property:${item.id}`}>{item.title}</option>)}</optgroup>
              <optgroup label="Projects">{content.filter((item) => item.kind === "project").map((item) => <option key={`project-${item.id}`} value={`project:${item.id}`}>{item.title}</option>)}</optgroup>
              <optgroup label="Banners">{content.filter((item) => item.kind === "banner").map((item) => <option key={`banner-${item.id}`} value={`banner:${item.id}`}>{item.title}</option>)}</optgroup>
            </select>
          </label>

          {contentSelection === "custom:" && (
            <label className="flex min-h-24 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border-default bg-bg-primary p-4 hover:border-amber-primary">
              <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(event) => void uploadCustomMedia(event.target.files?.[0])} />
              {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-amber-primary" /> : <Upload className="h-6 w-6 text-amber-primary" />}
              <span className="min-w-0"><span className="block font-semibold text-text-primary">{customMediaName || "Upload JPEG or PNG"}</span><span className="block text-xs text-text-secondary">Maximum 5MB</span></span>
            </label>
          )}

          {selectedMediaUrl && (
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-border-default bg-bg-primary">
              <Image src={selectedMediaUrl} alt="Selected broadcast media" fill unoptimized sizes="(max-width: 1280px) 100vw, 420px" className="object-cover" />
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-xs font-semibold text-white"><ImagePlus className="h-3.5 w-3.5" /> Image attached</span>
            </div>
          )}

          <label className="block space-y-1.5 text-sm font-semibold text-text-primary">
            Message
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} required minLength={5} maxLength={3500} rows={7} placeholder="A newly verified property is now available on ROAD..." className="w-full resize-y rounded-lg border border-border-default bg-bg-primary px-3 py-3 leading-relaxed outline-none focus:border-amber-primary" />
            <span className="flex justify-between text-xs font-normal text-text-tertiary"><span>Opt-out text and the selected listing link are appended automatically.</span><span>{message.length}/3500</span></span>
          </label>

          <div className="flex items-center gap-2 rounded-lg bg-amber-primary/10 p-3 text-xs font-medium text-text-secondary">
            <Clock3 className="h-4 w-4 shrink-0 text-amber-primary" /> Provider-safe paced delivery is active.
          </div>

          <Button type="submit" disabled={isSubmitting || isUploading || selectedCount === 0 || Boolean(processingCampaignId)} className="h-12 w-full gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Queue and send
          </Button>
        </form>
      </div>

      <section className="space-y-4 border-t border-border-default pt-7">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Campaign history</h2>
          <p className="text-sm text-text-secondary">Delivery progress and resumable queues.</p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border-default bg-bg-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border-default bg-bg-primary text-xs uppercase text-text-tertiary"><tr><th className="px-4 py-3">Campaign</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Recipients</th><th className="px-4 py-3">Sent</th><th className="px-4 py-3">Failed</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-border-default">
              {campaigns.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-text-secondary">No campaigns yet.</td></tr> : campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="px-4 py-3"><div className="font-semibold text-text-primary">{campaign.name}</div><div className="text-xs text-text-tertiary">{new Date(campaign.created_at).toLocaleString()}</div></td>
                  <td className="px-4 py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-bold capitalize", statusStyle(campaign.status))}>{campaignStatusLabel(campaign.status)}</span></td>
                  <td className="px-4 py-3 font-semibold text-text-primary">{campaign.recipient_count}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600">{campaign.sent_count}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{campaign.failed_count}</td>
                  <td className="px-4 py-3 text-right">{["queued", "sending"].includes(campaign.status) && <Button type="button" size="sm" variant="outline" disabled={Boolean(processingCampaignId)} onClick={() => void processCampaign(campaign.id)} className="gap-2">{processingCampaignId === campaign.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {campaign.status === "sending" ? "Resume" : "Start"}</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {processingCampaignId && <button type="button" onClick={() => { queueAbortRef.current = true; }} className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:underline"><PauseCircle className="h-4 w-4" /> Pause current queue</button>}
      </section>

      <Dialog open={Boolean(consentTarget)} onOpenChange={(open) => !open && setConsentTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record WhatsApp consent</DialogTitle>
            <DialogDescription>{consentTarget?.name} becomes eligible only after the consent details are saved.</DialogDescription>
          </DialogHeader>
          <label className="space-y-1.5 text-sm font-semibold text-text-primary">Consent source<input value={consentSource} onChange={(event) => setConsentSource(event.target.value)} placeholder="Website form, phone call, event" className="h-11 w-full rounded-lg border border-border-default bg-bg-primary px-3 outline-none focus:border-amber-primary" /></label>
          <label className="space-y-1.5 text-sm font-semibold text-text-primary">Evidence or note<input value={consentEvidence} onChange={(event) => setConsentEvidence(event.target.value)} placeholder="Form ID, date, or reference" className="h-11 w-full rounded-lg border border-border-default bg-bg-primary px-3 outline-none focus:border-amber-primary" /></label>
          <label className="flex items-start gap-2 text-sm text-text-secondary"><Checkbox checked={consentConfirmed} onCheckedChange={(checked) => setConsentConfirmed(checked === true)} className="mt-0.5" />This person explicitly agreed to receive ROAD WhatsApp updates.</label>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setConsentTarget(null)}>Cancel</Button><Button type="button" onClick={() => void saveConsent()} disabled={!consentConfirmed || consentSource.trim().length < 3 || isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save consent</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
