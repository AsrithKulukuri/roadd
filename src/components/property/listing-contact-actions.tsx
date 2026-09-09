"use client";
import { useState, useRef, useEffect } from "react";
import { requireActionSession } from "@/lib/action-auth";
import type { ContactAction } from "@/lib/listing-actions";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/property/whatsapp-share-button";
import { toast } from "sonner";
export async function performListingAction(listingType: "project" | "property", listingId: string, action: ContactAction) {
  if (!await requireActionSession(action)) return null;
  const response = await fetch("/api/listing-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingType, listingId, action, consent: true }) });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || "Unable to complete this action. Please retry.");
  return data;
}
export function ListingContactActions({ listingType, listingId }: { listingType: "project" | "property"; listingId: string }) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => { const reset = () => setPhone(""); reset(); window.addEventListener("road_auth_changed", reset); return () => window.removeEventListener("road_auth_changed", reset); }, [listingId, listingType]);
  async function act(action: ContactAction) {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const result = await performListingAction(listingType, listingId, action);
      if (!result) return;
      if (action === "reveal_phone") setPhone(result.phone);
      if (action === "whatsapp_click") {
        const waUrl = "https://wa.me/" + result.phone + "?text=" + encodeURIComponent("Hi, I am interested in this listing: " + window.location.href);
        // Use anchor click so mobile browsers trigger WhatsApp app via Universal Links
        // without navigating away from the current page (window.location.assign breaks mobile)
        const a = document.createElement("a");
        a.href = waUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      if (action === "callback_request") toast.success("Callback requested. Your enquiry has been recorded.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Please retry."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      {phone ? <a className="inline-flex items-center rounded-xl border px-4 py-2 font-semibold" href={"tel:+" + phone}>+{phone}</a> :
        <Button disabled={busy} variant="outline" onClick={() => act("reveal_phone")}>Reveal number</Button>}
      <Button disabled={busy} onClick={() => act("whatsapp_click")}><WhatsAppIcon />WhatsApp {listingType === "project" ? "Builder" : "Agent"}</Button>
      <Button disabled={busy} variant="outline" onClick={() => act("callback_request")}>Request callback</Button>
    </div>
    <p className="text-xs text-muted-foreground">By revealing a number, opening WhatsApp, requesting a callback or requesting a brochure, you share your name, verified phone and email (if provided) with this listing’s builder/agent and ROAD admin for follow-up.</p>
  </div>;
}
