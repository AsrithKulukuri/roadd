"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function AiWriter() {
  const [formData, setFormData] = useState({
    type: "Villa",
    location: "Jubilee Hills, Hyderabad",
    price: "5,00,00,000",
    bhk: "4",
    size: "4500",
    features: "Private pool, home theater, smart home automation, Italian marble flooring"
  });

  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateDescription = async () => {
    setIsGenerating(true);
    setDescription("");
    
    try {
      const response = await fetch("/api/ai-generate-desc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate");
      }

      setDescription(data.description);
      toast.success("Description generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate description");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!description) return;
    navigator.clipboard.writeText(description);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="bg-bg-card border border-border-default rounded-2xl p-6 shadow-sm mt-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-amber-primary" />
        </div>
        <div>
          <h3 className="font-heading text-xl font-bold text-text-primary">AI Description Generator</h3>
          <p className="text-sm text-text-secondary">Instantly write high-converting property descriptions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Property Type</label>
              <Input 
                value={formData.type} 
                onChange={(e) => setFormData({...formData, type: e.target.value})} 
                className="bg-bg-primary"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">BHK</label>
              <Input 
                value={formData.bhk} 
                onChange={(e) => setFormData({...formData, bhk: e.target.value})} 
                className="bg-bg-primary"
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Location</label>
            <Input 
              value={formData.location} 
              onChange={(e) => setFormData({...formData, location: e.target.value})} 
              className="bg-bg-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Price (₹)</label>
              <Input 
                value={formData.price} 
                onChange={(e) => setFormData({...formData, price: e.target.value})} 
                className="bg-bg-primary"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Size (sq.ft)</label>
              <Input 
                value={formData.size} 
                onChange={(e) => setFormData({...formData, size: e.target.value})} 
                className="bg-bg-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Key Features (comma separated)</label>
            <Input 
              value={formData.features} 
              onChange={(e) => setFormData({...formData, features: e.target.value})} 
              className="bg-bg-primary"
            />
          </div>

          <Button 
            onClick={generateDescription} 
            disabled={isGenerating}
            className="w-full bg-amber-primary hover:bg-amber-primary/90 text-bg-primary font-semibold"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {isGenerating ? "Generating..." : "Generate Magic Copy"}
          </Button>
        </div>

        <div className="bg-bg-primary border border-border-default rounded-xl p-4 flex flex-col relative min-h-[300px]">
          {description ? (
            <>
              <button 
                onClick={copyToClipboard}
                className="absolute top-4 right-4 p-2 bg-bg-card hover:bg-white/10 rounded-lg text-text-secondary transition-colors border border-border-default"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <div className="text-sm text-text-primary whitespace-pre-line leading-relaxed pr-8">
                {description}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary">
              <Sparkles className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Generated description will appear here...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
