"use client";
import { useEffect, useState } from "react";
import { ACTION_LABELS, type ContactAction } from "@/lib/listing-actions";
type Lead = { id: string; listing_name: string; action: ContactAction; buyer_name: string; buyer_phone: string; buyer_email: string; recipient_phone?: string | null; created_at: string; builder_notified: boolean; admin_notified: boolean };

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const raw = String(val);
  const safe = /^[=+\-@\t\r]/.test(raw.trimStart()) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function ListingLeadsPanel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  function exportExcel() {
    if (!leads.length) return;
    const headers = [
      "S.No",
      "Date & Time (IST)",
      "Listing Name",
      "Action",
      "Buyer Name",
      "Buyer Phone",
      "Buyer Email",
      "Builder Phone",
      "Builder Notified",
      "Admin Notified",
    ];
    const rows = leads.map((lead, idx) => [
      idx + 1,
      new Date(lead.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      lead.listing_name || "-",
      ACTION_LABELS[lead.action] || lead.action,
      lead.buyer_name || "Interested Buyer",
      lead.buyer_phone || "-",
      lead.buyer_email || "-",
      lead.recipient_phone || "-",
      lead.builder_notified ? "Sent" : "Not sent",
      lead.admin_notified ? "Sent" : "Not sent",
    ]);
    const csv = "\uFEFF" + [headers, ...rows].map(r => r.map(escapeCsvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ROAD_Listing_Leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  async function refresh(background = false) {
    if (!background) setBusy(true); setError("");
    try {
      const response = await fetch("/api/listing-leads", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load enquiries.");
      setLeads(data.leads);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to load enquiries."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(true); }, 30000);
    return () => window.clearInterval(timer);
  }, []);
  return <section className="rounded-2xl border border-border-default bg-bg-card p-5 space-y-4">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Listing contact enquiries</h2><p className="text-sm text-text-secondary">Latest 200 explicit requests. Saves and page views do not share buyer details.</p></div><div className="flex items-center gap-2"><button onClick={exportExcel} disabled={busy || !leads.length} className="rounded-xl border px-3 py-2 disabled:opacity-50">Export Excel</button><button onClick={() => void refresh()} disabled={busy} className="rounded-xl border px-3 py-2">Refresh</button></div></div>
    {error ? <p role="alert" className="text-red-600">{error}</p> : busy ? <p>Loading enquiries…</p> : !leads.length ? <p>No contact enquiries yet.</p> :
    <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{["Listing / action", "Buyer", "Phone / email", "Requested", "WhatsApp delivery"].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{leads.map(lead => <tr key={lead.id} className="border-t border-border-default">
      <td className="p-3">{lead.listing_name}<div className="font-semibold">{ACTION_LABELS[lead.action] || lead.action}</div></td>
      <td className="p-3">{lead.buyer_name || "Not provided"}</td><td className="p-3">{lead.buyer_phone || "Not provided"}<div>{lead.buyer_email || ""}</div></td>
      <td className="p-3 whitespace-nowrap">{new Date(lead.created_at).toLocaleString()}</td><td className="p-3">Builder: {lead.builder_notified ? "Sent" : "Not sent"}<div>Admin: {lead.admin_notified ? "Sent" : "Not sent"}</div></td>
    </tr>)}</tbody></table></div>}
  </section>;
}
