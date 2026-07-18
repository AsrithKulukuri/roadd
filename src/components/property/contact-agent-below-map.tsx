"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Property } from "@/types/property";

interface ContactAgentBelowMapProps {
  property: Property;
}

export function ContactAgentBelowMap({ property }: ContactAgentBelowMapProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  if (isLoggedIn) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-primary/10 via-amber-primary/5 to-transparent border border-amber-primary/20 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 mt-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-primary/10 flex items-center justify-center text-amber-primary shrink-0 border border-amber-primary/20">
          <MessageSquare className="w-5 h-5 animate-pulse" />
        </div>
        <div className="space-y-0.5">
          <h4 className="font-heading font-bold text-text-primary text-sm sm:text-base">Contact Agent for Details</h4>
          <p className="text-text-secondary text-xs sm:text-sm">Sign in to unlock contact numbers, email addresses, and send direct inquiries.</p>
        </div>
      </div>
      <Button 
        type="button"
        variant="amber" 
        onClick={() => router.push(`/login?redirect=/properties/${property.slug}`)}
        className="rounded-xl px-5 h-11 shrink-0 font-semibold shadow-amber-glow"
      >
        <Lock className="w-4 h-4 mr-2" />
        Sign In to Contact Agent
      </Button>
    </div>
  );
}
