"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Phone, Mail, MessageSquare, BadgeCheck, Lock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPriceCompact, formatINR } from "@/lib/utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { TourBookingModal } from "@/components/property/tour-booking-modal";
import type { Property } from "@/types/property";

interface PropertyContactProps {
  property: Property;
}

export function PropertyContact({ property }: PropertyContactProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (isSupabaseConfigured()) {
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);
      } else {
        const stored = localStorage.getItem("road_user");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setIsLoggedIn(!!parsed.isLoggedIn);
          } catch (e) {}
        }
      }
    };
    
    checkAuth();

    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsLoggedIn(!!session);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

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
        
        {isLoggedIn ? (
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
        ) : (
          <div className="bg-bg-primary/40 border border-border-default/60 rounded-2xl p-4 flex flex-col items-center gap-2 text-center mt-2">
            <Lock className="w-4 h-4 text-amber-primary animate-pulse" />
            <div className="space-y-0.5">
              <p className="text-xs text-text-secondary font-semibold">Pricing is locked</p>
              <p className="text-[10px] text-text-tertiary">Sign in to unlock price details.</p>
            </div>
            <Button 
              type="button" 
              size="sm" 
              variant="amber" 
              className="h-8 rounded-lg text-xs w-full mt-1" 
              onClick={() => router.push(`/login?redirect=/properties/${property.slug}`)}
            >
              Sign In to View Price
            </Button>
          </div>
        )}
      </div>

      {isLoggedIn ? (
        <>
          <div className="flex items-center gap-4 p-4 bg-bg-primary/50 rounded-2xl border border-border-default/50 mb-6">
            <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src={property.ownerAvatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80"}
                alt={property.ownerName || "Property Agent"}
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
            className="w-full h-12 bg-amber-primary hover:bg-amber-primary/90 text-bg-primary font-semibold rounded-xl shadow-amber-glow"
            onClick={() => setIsTourModalOpen(true)}
            type="button"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Schedule a Tour
          </Button>
          </form>

          <div className="flex justify-between mt-4">
            <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary" asChild>
              <a href={`tel:${property.ownerPhone}`}>
                <Phone className="w-4 h-4 mr-2" />
                Call
              </a>
            </Button>
            <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary" asChild>
              <a 
                href={`https://wa.me/${property.ownerPhone?.replace(/[\\s+]/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in "${property.title}". Is it still available?`)}`}
                target="_blank" rel="noopener noreferrer"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </a>
            </Button>
          </div>
        </>
      ) : (
        <div className="bg-bg-primary/40 border border-border-default/60 rounded-3xl p-5 flex flex-col items-center gap-3 text-center my-4">
          <div className="w-10 h-10 rounded-full bg-amber-primary/10 flex items-center justify-center text-amber-primary">
            <MessageSquare className="w-4.5 h-4.5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-heading font-bold text-sm text-text-primary">Contact Agent is Locked</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Sign up or log in to message {property.ownerName} directly or request viewings.
            </p>
          </div>
          <Button 
            type="button" 
            variant="amber" 
            className="w-full shadow-amber-glow mt-2 rounded-xl text-xs h-10" 
            onClick={() => router.push(`/login?redirect=/properties/${property.slug}`)}
          >
            Sign In to Contact Agent
          </Button>
        </div>
      )}
      
      <TourBookingModal 
        isOpen={isTourModalOpen} 
        onClose={() => setIsTourModalOpen(false)} 
        propertyName={property.title}
        propertyLocation={`${property.location.locality}, ${property.location.city}`}
      />
    </div>
  );
}
