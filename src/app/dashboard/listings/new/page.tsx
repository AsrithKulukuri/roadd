"use client";

import { useState } from "react";
import { ArrowLeft, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function PostPropertyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        toast.success("Property posted successfully!");
        router.push("/dashboard/listings");
      }, 1500);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <Link href="/dashboard/listings" className="inline-flex items-center text-sm text-text-secondary hover:text-amber-primary transition-colors mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Listings
        </Link>
        <h1 className="font-heading text-3xl font-bold text-text-primary">Post New Property</h1>
        <p className="text-text-secondary mt-1">Fill in the details to list your property on ROAD FACING.</p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-bg-hover -z-10 rounded-full" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-amber-primary -z-10 rounded-full transition-all duration-300"
          style={{ width: `${((step - 1) / 2) * 100}%` }}
        />
        
        {[1, 2, 3].map((s) => (
          <div 
            key={s}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${
              step === s 
                ? "bg-bg-primary border-amber-primary text-amber-primary" 
                : step > s 
                  ? "bg-amber-primary border-amber-primary text-bg-primary"
                  : "bg-bg-primary border-border-default text-text-tertiary"
            }`}
          >
            {step > s ? <Check className="h-5 w-5" /> : s}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-bg-card border border-border-default p-6 md:p-8 rounded-3xl shadow-sm">
        
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="font-heading text-xl font-bold border-b border-border-default pb-2">Basic Details</h2>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Property Type</label>
                <select required className="flex h-10 w-full rounded-xl border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-primary/40 focus:border-amber-primary">
                  <option value="">Select Type</option>
                  <option value="apartment">Apartment</option>
                  <option value="villa">Villa / Independent House</option>
                  <option value="plot">Plot / Land</option>
                  <option value="commercial">Commercial Space</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Listing For</label>
                <select required className="flex h-10 w-full rounded-xl border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-primary/40 focus:border-amber-primary">
                  <option value="sale">Sale</option>
                  <option value="rent">Rent / Lease</option>
                  <option value="pg">PG / Co-living</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Property Title</label>
              <Input required placeholder="e.g. Beautiful 3BHK Sea-facing Apartment" />
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">City</label>
                <Input required placeholder="e.g. Visakhapatnam" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Locality</label>
                <Input required placeholder="e.g. Rushikonda" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="font-heading text-xl font-bold border-b border-border-default pb-2">Property Features</h2>
            
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Bedrooms</label>
                <Input type="number" min="0" required placeholder="3" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Bathrooms</label>
                <Input type="number" min="0" required placeholder="3" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Balconies</label>
                <Input type="number" min="0" required placeholder="2" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Built-up Area (Sq.ft)</label>
                <Input type="number" min="0" required placeholder="1800" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Price (₹)</label>
                <Input type="number" min="0" required placeholder="8500000" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Description</label>
              <textarea 
                required 
                rows={5}
                className="flex w-full rounded-xl border border-border-default bg-bg-card px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-primary/40 focus:border-amber-primary resize-none"
                placeholder="Describe your property in detail. Mention nearby landmarks, specific features, etc."
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="font-heading text-xl font-bold border-b border-border-default pb-2">Photos & Verification</h2>
            
            <div className="space-y-4">
              <label className="text-sm font-medium text-text-secondary">Property Photos (Up to 10)</label>
              <div className="border-2 border-dashed border-border-default rounded-2xl p-10 flex flex-col items-center justify-center bg-bg-hover/50 hover:bg-bg-hover transition-colors cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-amber-primary/10 flex items-center justify-center mb-4">
                  <Upload className="h-8 w-8 text-amber-primary" />
                </div>
                <p className="font-medium text-text-primary mb-1">Click to upload or drag and drop</p>
                <p className="text-sm text-text-tertiary">PNG, JPG or WEBP (Max. 5MB per file)</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">RERA ID (If applicable)</label>
              <Input placeholder="e.g. PRM/KA/RERA/..." />
              <p className="text-xs text-text-tertiary">Providing a valid RERA ID increases buyer trust significantly.</p>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border-default flex justify-between">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <div></div> // Spacer
          )}
          
          <Button type="submit" variant="amber" disabled={isSubmitting}>
            {step < 3 ? "Next Step" : isSubmitting ? "Submitting..." : "Post Property"}
          </Button>
        </div>

      </form>
    </div>
  );
}
