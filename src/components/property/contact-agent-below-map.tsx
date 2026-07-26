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
      // 1. Check local storage session (WhatsApp OTP / Unified Login)
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("road_user");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.isLoggedIn) {
              setIsLoggedIn(true);
              return;
            }
          } catch (e) {}
        }
      }

      // 2. Fallback to Supabase auth session
      if (isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setIsLoggedIn(true);
            return;
          }
        } catch (e) {}
      }

      setIsLoggedIn(false);
    };

    checkAuth();
  }, []);

  if (isLoggedIn) {
    return (
      <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 mt-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/30">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h4 className="font-heading font-extrabold text-text-primary text-sm sm:text-base">Owner / Verified Agent Contact Unlocked</h4>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">Verified</span>
            </div>
            <p className="text-text-secondary text-xs sm:text-sm">
              Contact: <strong className="text-emerald-400 font-black">+91 8977311418</strong> • asrithkulkuri@gmail.com
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button 
            type="button"
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl px-5 h-11 shrink-0 shadow-md gap-2"
            asChild
          >
            <a 
              href={`https://wa.me/918977311418?text=${encodeURIComponent("Hi! I am interested in your property: " + property.title + " located at " + property.location.locality + ". Please share pricing and details.")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageSquare className="w-4 h-4 fill-slate-950" />
              WhatsApp (+91 8977311418)
            </a>
          </Button>
        </div>
      </div>
    );
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
