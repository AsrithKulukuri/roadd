"use client";
import { useState } from "react";
import { useBuilderStore } from "@/stores/builder-store";
import type { Project } from "@/types/project";
import { verificationEvidenceSchema } from "@/lib/builder-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function VerificationSubmission({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { getCurrentBuilder, submitRequest, requests } = useBuilderStore();
  const latest = requests.find(r => r.projectId === project.id && r.details?.verification);
  if (project.projectType !== "venture") return null;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const builder = getCurrentBuilder();
    if (!builder) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const values = Object.fromEntries(form.entries());
      const proof = verificationEvidenceSchema.parse({ ...Object.fromEntries(Object.entries(values).filter(([key]) => key !== "file")), roadWidth: Number(form.get("roadWidth")), documentPath: "pending-upload" });
      const upload = new FormData();
      upload.set("file", form.get("file")!);
      upload.set("projectId", project.id);
      const response = await fetch("/api/builder/documents", { method: "POST", body: upload });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Document upload failed.");
      await submitRequest({ builderId: builder.id, builderName: builder.companyName, projectId: project.id, projectName: project.name, requestType: "custom_concierge", title: "Plot documents and CRDA verification", priority: "normal", details: { verification: { ...proof, documentPath: data.documentPath } } });
      toast.success("Documents submitted for admin verification.");
      setOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Submission failed. Please retry."); }
    finally { setBusy(false); }
  }
  return <div className="border-t pt-3 mt-3 space-y-3 text-xs">
    <p>Document review: <strong>{latest ? latest.status.replaceAll("_", " ") : "Not submitted"}</strong></p>
    {latest?.adminNotes && <p>{latest.adminNotes}</p>}
    <Button type="button" variant="outline" onClick={() => setOpen(!open)}>{open ? "Close document form" : "Submit plot documents"}</Button>
    {open && <form onSubmit={submit} className="space-y-3">
      <p>Enter details from the official layout. Admin will check your evidence before approval.</p>
      {[
        ["crdaLpNumber", "Official CRDA LP number"], ["surveyNumber", "Survey number"],
        ["plotDimensions", "Dimensions with units (e.g. 30 × 60 ft)"],
        ["north", "North boundary and measurement"], ["south", "South boundary and measurement"],
        ["east", "East boundary and measurement"], ["west", "West boundary and measurement"],
      ].map(([name, label]) => <label className="block space-y-1" key={name}><span>{label}</span><Input name={name} required maxLength={250} /></label>)}
      {["borewell", "electricity"].map(name => <label className="block space-y-1" key={name}><span>{name === "borewell" ? "Borewell facility" : "Electricity availability"}</span><select name={name} className="block w-full rounded border bg-background p-2"><option value="unknown">Not confirmed</option><option value="yes">Yes</option><option value="no">No</option></select></label>)}
      <label className="block">Road facing<select name="facing" className="block w-full rounded border bg-background p-2">{["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"].map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="block">Road width (ft)<Input name="roadWidth" type="number" min="0.1" max="1000" step="0.1" required /></label>
      <label className="block">Official layout PDF (private, up to 10 MB)<Input name="file" type="file" accept="application/pdf" required /></label>
      <Button disabled={busy} type="submit">{busy ? "Submitting…" : "Submit for verification"}</Button>
    </form>}
  </div>;
}
