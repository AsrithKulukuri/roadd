"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, Phone, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: `I'm interested in ${property.title}.`,
  });

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
              setFormData((prev) => ({
                ...prev,
                fullName: parsed.name || prev.fullName,
                email: parsed.email || prev.email,
                phone: parsed.phone || prev.phone,
              }));
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
            setFormData((prev) => ({
              ...prev,
              fullName: session.user.user_metadata?.full_name || prev.fullName,
              email: session.user.email || prev.email,
            }));
            return;
          }
        } catch (e) {}
      }

      setIsLoggedIn(false);
    };

    checkAuth();
  }, []);

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      // Redirect unauthenticated users directly to WhatsApp OTP Login
      router.push(`/login?redirect=/properties/${property.slug}`);
      return;
    }

    setIsSubmitting(true);
    const whatsappMsg = encodeURIComponent(
      `Hi! I am interested in ${property.title} located at ${property.location.locality}, ${property.location.city}.\n\nMy Details:\nName: ${formData.fullName || "Buyer"}\nEmail: ${formData.email}\nPhone: ${formData.phone}`
    );

    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Opening WhatsApp to connect with owner (+91 8977311418)...");
      window.open(`https://wa.me/918977311418?text=${whatsappMsg}`, "_blank");
    }, 400);
  };

  return (
    <div className="sticky top-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
      {/* Realtor.com Clean Title */}
      <h3 className="font-heading text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
        More about this property
      </h3>

      {/* Realtor.com Clean Form */}
      <form onSubmit={handleAction} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Full name *
          </label>
          <Input
            type="text"
            required
            placeholder="e.g. Asrith Kulukuri"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="h-12 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-amber-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Email *
          </label>
          <Input
            type="email"
            required
            placeholder="asrithkulkuri@gmail.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="h-12 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-amber-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Phone *
          </label>
          <Input
            type="tel"
            required
            placeholder="+91 8977311418"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="h-12 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-amber-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            How can an agent help?
          </label>
          <textarea
            rows={3}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 font-medium"
          />
        </div>

        {/* Realtor.com Primary Action Button: WhatsApp agent */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-14 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-base rounded-full shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-5 h-5 fill-slate-950 text-slate-950" />
          <span>{isLoggedIn ? "WhatsApp agent" : "WhatsApp agent (Sign in)"}</span>
        </Button>

        {/* Direct Call Info when Logged In */}
        {isLoggedIn && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-400 font-bold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>Owner Direct:</span>
            </span>
            <a href="tel:+918977311418" className="hover:underline text-sm font-extrabold text-white">
              +91 8977311418
            </a>
          </div>
        )}

        {/* Schedule Tour Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsTourModalOpen(true)}
          className="w-full h-11 border-amber-500/50 text-amber-500 hover:bg-amber-500/10 font-bold text-xs rounded-full cursor-pointer flex items-center justify-center gap-2"
        >
          <Calendar className="w-4 h-4" /> Schedule Private Site Visit
        </Button>

        {/* Realtor.com Legal Disclaimer */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-2 border-t border-slate-200 dark:border-slate-800">
          By proceeding, you consent to receive WhatsApp updates and calls from ROAD verified property agents regarding your inquiry.
        </p>
      </form>

      <TourBookingModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
        propertyName={property.title}
        propertyLocation={`${property.location.locality}, ${property.location.city}`}
      />
    </div>
  );
}
