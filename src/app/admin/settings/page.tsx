"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Settings saved successfully!");
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-heading text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage global platform configurations.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-text-primary border-b border-border-default pb-2">General Info</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Platform Name</label>
              <Input defaultValue="ROAD FACING" className="bg-bg-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Support Email</label>
              <Input defaultValue="support@road.com" className="bg-bg-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Contact Phone</label>
              <Input defaultValue="+91 8977311418" className="bg-bg-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Default Currency</label>
              <Input defaultValue="INR (₹)" disabled className="bg-bg-primary/50 opacity-70" />
            </div>
          </div>
        </div>

        <div className="bg-bg-card border border-border-default rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-text-primary border-b border-border-default pb-2">SEO & Metadata</h2>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Meta Title</label>
            <Input defaultValue="ROAD FACING — India's Premium Real Estate Platform" className="bg-bg-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Meta Description</label>
            <textarea 
              defaultValue="Buy, sell, and rent properties across India with ROAD FACING. Verified listings, RERA-compliant, AI-powered search, and trusted agents."
              className="w-full h-24 rounded-xl border border-border-input bg-bg-primary/50 px-3 py-2 text-sm text-text-primary outline-none focus-visible:ring-1 focus-visible:ring-amber-primary"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="amber" className="h-12 px-8 gap-2 rounded-xl shadow-amber-glow">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
