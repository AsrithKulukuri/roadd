"use client";
import { useEffect, useState } from "react";
import { ACTION_LABELS, type ContactAction } from "@/lib/listing-actions";
type Lead = { id: string; listing_name: string; action: ContactAction; buyer_name: string; buyer_phone: string; buyer_email: string; created_at: string; builder_notified: boolean; admin_notified: boolean };
export function ListingLeadsPanel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  async function refresh() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/listing-leads", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load enquiries.");
      setLeads(data.leads);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to load enquiries."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, []);
  return <section className="rounded-2xl border border-border-default bg-bg-card p-5 space-y-4">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Listing contact enquiries</h2><p className="text-sm text-text-secondary">Latest 200 explicit requests. Saves and page views do not share buyer details.</p></div><button onClick={refresh} disabled={busy} className="rounded-xl border px-3 py-2">Refresh</button></div>
    {error ? <p role="alert" className="text-red-600">{error}</p> : busy ? <p>Loading enquiries…</p> : !leads.length ? <p>No contact enquiries yet.</p> :
    <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{["Listing / action", "Buyer", "Phone / email", "Requested", "WhatsApp delivery"].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{leads.map(lead => <tr key={lead.id} className="border-t border-border-default">
      <td className="p-3">{lead.listing_name}<div className="font-semibold">{ACTION_LABELS[lead.action] || lead.action}</div></td>
      <td className="p-3">{lead.buyer_name || "Not provided"}</td><td className="p-3">{lead.buyer_phone || "Not provided"}<div>{lead.buyer_email || ""}</div></td>
      <td className="p-3 whitespace-nowrap">{new Date(lead.created_at).toLocaleString()}</td><td className="p-3">Builder: {lead.builder_notified ? "Sent" : "Not sent"}<div>Admin: {lead.admin_notified ? "Sent" : "Not sent"}</div></td>
    </tr>)}</tbody></table></div>}
  </section>;
}
