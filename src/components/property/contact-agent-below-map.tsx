"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, Lock, ShieldCheck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { Property } from "@/types/property";

interface ContactAgentBelowMapProps {
  property: Property;
}

export function ContactAgentBelowMap({ property }: ContactAgentBelowMapProps) {
  const router = useRouter();
  const { isLoggedIn, getLoginUrl } = useAuthSession();

  const targetRedirect = `/properties/${property.slug}`;
  // TODO: For future production hardening, strip private owner contact fields from unauthenticated public Supabase queries / API responses
  const ownerPhone = property.ownerPhone || "+91 8977311418";
  const cleanPhone = ownerPhone.replace(/\D/g, "");

  if (isLoggedIn) {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 mt-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-500 shrink-0 border border-amber-500/30">
            <ShieldCheck className="w-6 h-6 text-amber-500" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h4 className="font-heading font-extrabold text-text-primary text-sm sm:text-base">
                Owner / Verified Agent Contact Unlocked
              </h4>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Verified
              </span>
            </div>
            <p className="text-text-secondary text-xs sm:text-sm">
              Direct: <strong className="text-amber-600 dark:text-amber-400 font-black">{ownerPhone}</strong>
              {property.ownerEmail && (
                <span className="text-text-tertiary"> • {property.ownerEmail}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            type="button"
            className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black rounded-xl px-5 h-11 shrink-0 shadow-md gap-2 cursor-pointer w-full md:w-auto"
            asChild
          >
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                "Hi! I am interested in your property: " +
                  property.title +
                  " located at " +
                  property.location.locality +
                  ". Please share pricing and details."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageSquare className="w-4 h-4 fill-slate-950 text-slate-950" />
              WhatsApp ({ownerPhone})
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 mt-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 border border-amber-500/20">
          <Lock className="w-5 h-5 text-amber-500 animate-pulse" />
        </div>
        <div className="space-y-0.5">
          <h4 className="font-heading font-bold text-text-primary text-sm sm:text-base">
            Contact Agent for Details
          </h4>
          <p className="text-text-secondary text-xs sm:text-sm">
            Sign in to unlock verified phone numbers, email addresses, and send direct WhatsApp inquiries.
          </p>
        </div>
      </div>
      <Button
        type="button"
        onClick={() => router.push(getLoginUrl(targetRedirect))}
        className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black rounded-xl px-5 h-11 shrink-0 shadow-md cursor-pointer w-full md:w-auto"
      >
        <Lock className="w-4 h-4 mr-2 fill-slate-950 text-slate-950" />
        Sign In to Contact Agent
      </Button>
    </div>
  );
}

