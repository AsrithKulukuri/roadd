"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Phone, Mail, MessageSquare, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPriceCompact, formatINR } from "@/lib/utils";
import type { Property } from "@/types/property";

interface PropertyContactProps {
  property: Property;
}

export function PropertyContact({ property }: PropertyContactProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Inquiry sent successfully!", {
        description: `${property.ownerName} will get back to you shortly.`,
      });
    }, 1000);
  };

  const isRent = property.listingType === "rent" || property.listingType === "pg";
  const displayPrice = isRent 
    ? `${formatINR(property.price)}/mo` 
    : formatPriceCompact(property.price);

  return (
    <div className="sticky top-24 bg-bg-card border border-border-default rounded-3xl p-6 shadow-elevated">
      <div className="mb-6">
        <p className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-1">
          {property.listingType === "sale" ? "Asking Price" : "Monthly Rent"}
        </p>
        <div className="flex items-end gap-3">
          <h2 className="font-heading text-3xl font-bold text-amber-primary leading-none">
            {displayPrice}
          </h2>
          {property.listingType === "sale" && property.pricePerSqft > 0 && (
            <span className="text-sm text-text-secondary mb-1">
              ({formatINR(property.pricePerSqft)}/sq.ft)
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 bg-bg-primary/50 rounded-2xl border border-border-default/50 mb-6">
        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
          <Image
            src={property.ownerAvatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80"}
            alt={property.ownerName}
            fill
            className="object-cover"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="font-semibold text-text-primary">{property.ownerName}</h4>
            {property.isOwnerVerified && (
              <BadgeCheck className="w-4 h-4 text-amber-primary" />
            )}
          </div>
          <p className="text-xs text-text-secondary capitalize">
            {property.ownerType}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          required 
          placeholder="Your Name" 
          className="bg-bg-primary/50 border-border-default/50" 
        />
        <Input 
          required 
          type="email" 
          placeholder="Email Address" 
          className="bg-bg-primary/50 border-border-default/50" 
        />
        <Input 
          required 
          type="tel" 
          placeholder="Phone Number" 
          className="bg-bg-primary/50 border-border-default/50" 
        />
        <textarea
          required
          placeholder="I am interested in this property..."
          className="w-full h-24 px-3 py-2 text-sm rounded-2xl bg-bg-primary/50 border border-border-default/50 focus:outline-none focus:ring-2 focus:ring-amber-primary/50 resize-none text-text-primary placeholder:text-text-tertiary"
        />
        
        <Button 
          type="submit" 
          variant="amber" 
          className="w-full shadow-amber-glow"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending..." : "Request a Tour"}
        </Button>
      </form>

      <div className="flex justify-between mt-4">
        <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary">
          <Phone className="w-4 h-4 mr-2" />
          Call
        </Button>
        <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary">
          <MessageSquare className="w-4 h-4 mr-2" />
          WhatsApp
        </Button>
      </div>
    </div>
  );
}
