"use client";

import { useEffect, useState } from "react";
import { RefreshCw, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";

interface MessageLog {
  id: string; phone: string; recipient_type: string; message_type: string;
  message_body: string; media_url: string | null; template_name: string | null;
  provider: string; provider_message_id: string | null; request_id: string | null;
  status: string; error_message: string | null; error_category: string | null;
  created_at: string; accepted_at: string | null; sent_at: string | null;
  delivered_at: string | null; read_at: string | null; failed_at: string | null;
}
const statuses = ["queued", "accepted", "sent", "delivered", "read", "failed", "simulated"];
const colors: Record<string, string> = {
  queued: "bg-slate-100 text-slate-700", accepted: "bg-amber-50 text-amber-800",
  sent: "bg-indigo-50 text-indigo-700", delivered: "bg-emerald-50 text-emerald-700",
  read: "bg-sky-50 text-sky-700", failed: "bg-red-50 text-red-700", simulated: "bg-purple-50 text-purple-700",
};
function time(value: string | null) {
  return value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "medium" }) : "—";
}
const inputClass = "rounded-xl border border-border-default bg-bg-card px-3 py-2.5 text-sm text-text-primary min-w-0";

export default function WhatsAppLogsPage() {
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [recipient, setRecipient] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => { if (!document.hidden) setRefresh(value => value + 1); }, 15000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), phone, status, recipient, from, to });
        const response = await fetch(`/api/admin/whatsapp/logs?${params}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load logs");
        setLogs(data.logs); setTotal(data.total); setError(""); setUpdated(new Date().toISOString());
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load logs");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [page, phone, status, recipient, from, to, refresh]);

  return <div className="space-y-6 p-5 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-bold text-text-primary">WhatsApp Logs</h1>
        <p className="mt-2 text-sm text-text-secondary">Messages to users, builders and admins, with delivery history and failure details.</p></div>
      <button onClick={() => setRefresh(value => value + 1)} disabled={loading} className={`${inputClass} inline-flex items-center gap-2 disabled:opacity-50`}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
    </div>
    <div className="rounded-2xl border border-border-default bg-bg-card p-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-1 text-xs text-text-secondary">Recipient phone<input className={inputClass} value={phone} placeholder="Search phone number" onChange={e => { setPhone(e.target.value); setPage(1); }} /></label>
        <label className="grid gap-1 text-xs text-text-secondary">Status<select className={inputClass} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{statuses.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></label>
        <label className="grid gap-1 text-xs text-text-secondary">Recipient type<select className={inputClass} value={recipient} onChange={e => { setRecipient(e.target.value); setPage(1); }}><option value="">All recipients</option><option value="user">Users</option><option value="builder">Builders</option><option value="admin">Admins</option></select></label>
        <label className="grid gap-1 text-xs text-text-secondary">From date (IST)<input type="date" className={inputClass} value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></label>
        <label className="grid gap-1 text-xs text-text-secondary">To date (IST)<input type="date" className={inputClass} value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></label>
      </div>
      <p className="text-xs text-text-tertiary">Accepted means the provider accepted the request. Delivered and read require provider receipts; missing timestamps mean no receipt yet. All times are IST. OTP codes are hidden.</p>
    </div>
    {error && <div role="alert" className="rounded-xl bg-red-50 text-red-800 p-4">{error}</div>}
    <div className="flex flex-wrap justify-between gap-2 text-sm text-text-secondary"><span>{total.toLocaleString()} matching messages</span><span className="text-xs">{updated ? `Updated ${time(updated)} · Refreshes every 15s` : "Loading message history…"}</span></div>
    <div className="rounded-2xl border border-border-default bg-bg-card overflow-hidden" aria-busy={loading}>
      {!logs.length ? <div className="p-12 text-center text-text-secondary"><MessageSquare className="mx-auto mb-3 h-8 w-8 opacity-50" />{loading ? "Loading logs…" : error ? "Message history could not be loaded." : "No messages match these filters. New application messages will appear here."}</div> :
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-bg-primary text-text-secondary"><tr>{["Recipient", "Message", "Status", "Created (IST)", "History"].map(title => <th key={title} className="px-5 py-4 font-medium">{title}</th>)}</tr></thead>
          <tbody className="divide-y divide-border-default">{logs.map(log => <tr key={log.id} className="align-top">
            <td className="px-5 py-4 whitespace-nowrap"><div className="font-medium text-text-primary">+{log.phone}</div><div className="mt-1 capitalize text-xs text-text-tertiary">{log.recipient_type} · {log.provider}</div></td>
            <td className="px-5 py-4 min-w-64 max-w-md"><div className="text-xs uppercase text-text-tertiary mb-1">{log.message_type}{log.template_name ? ` · ${log.template_name}` : ""}</div><p className="line-clamp-3 whitespace-pre-wrap break-words text-text-primary">{log.message_body}</p>{log.error_message && <p className="mt-2 text-xs text-red-600">{log.error_category && `${log.error_category}: `}{log.error_message}</p>}</td>
            <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${colors[log.status] || colors.queued}`}>{log.status}</span></td>
            <td className="px-5 py-4 whitespace-nowrap text-xs text-text-secondary">{time(log.created_at)}</td>
            <td className="px-5 py-4 min-w-64"><details><summary className="cursor-pointer font-medium text-amber-700">View details</summary>
              <dl className="mt-3 space-y-2 text-xs">{[["Created", log.created_at], ["Accepted", log.accepted_at], ["Sent", log.sent_at], ["Delivered", log.delivered_at], ["Read", log.read_at], ["Failed", log.failed_at]].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="text-text-tertiary">{label}</dt><dd className="text-text-secondary">{time(value)}</dd></div>)}</dl>
              <p className="mt-3 whitespace-pre-wrap break-words text-xs text-text-primary">{log.message_body}</p>
              {log.media_url && <p className="mt-2 break-all text-xs text-text-secondary">Media: {log.media_url}</p>}
              <p className="mt-3 break-all text-xs text-text-tertiary">Message ID: {log.provider_message_id || "Not provided"}<br />Request: {log.request_id || "—"}</p>
            </details></td>
          </tr>)}</tbody></table></div>}
    </div>
    <div className="flex items-center justify-between text-sm text-text-secondary"><span>Page {page} of {Math.max(1, Math.ceil(total / 50))}</span><div className="flex gap-2"><button aria-label="Previous page" className={`${inputClass} disabled:opacity-40`} disabled={page === 1 || loading} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></button><button aria-label="Next page" className={`${inputClass} disabled:opacity-40`} disabled={page * 50 >= total || loading} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></button></div></div>
    <p className="text-xs text-text-tertiary">History starts when logging is enabled. Messages shared manually through the WhatsApp app are outside application tracking.</p>
  </div>;
}
