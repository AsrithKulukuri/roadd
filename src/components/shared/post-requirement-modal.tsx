"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Building2, MapPin, IndianRupee, Phone, User, Mail, Clock, CheckCircle2 } from "lucide-react";
import { useInquiriesStore } from "@/stores/inquiries-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PostRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROPERTY_TYPES = [
  "Apartment / Flat",
  "Luxury Villa",
  "Independent House",
  "Residential Plot / Land",
  "Commercial Space",
  "Farm Land / Agriculture",
  "Builder Floor",
];

const BUDGET_PRESETS = [
  "Under ₹30 Lakhs",
  "₹30L - ₹50 Lakhs",
  "₹50L - ₹75 Lakhs",
  "₹75L - ₹1 Crore",
  "₹1 Cr - ₹2 Crore",
  "₹2 Cr - ₹3 Crore",
  "₹3 Crore+",
  "Flexible / Any",
];

const LOCATIONS = ["Vijayawada", "Guntur", "Amaravati", "Visakhapatnam (Vizag)", "Mangalagiri", "Tadepalli", "Poranki", "Gorantla", "Other"];

const BHK_OPTIONS = ["1 BHK", "2 BHK", "3 BHK", "4+ BHK", "Plot / Land", "Commercial"];

const TIMELINES = ["Immediate (Within 15 days)", "Within 1 - 3 Months", "Within 3 - 6 Months", "Exploring / Long term"];

const WHATSAPP_NUMBER = "8977311418";

export function PostRequirementModal({ isOpen, onClose }: PostRequirementModalProps) {
  const { addRequirement } = useInquiriesStore();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState<"Buy" | "Rent" | "Invest" | "Commercial Lease">("Buy");
  const [propertyType, setPropertyType] = useState("Apartment / Flat");
  const [location, setLocation] = useState("Vijayawada");
  const [customLocation, setCustomLocation] = useState("");
  const [budget, setBudget] = useState("₹50L - ₹75 Lakhs");
  const [bhk, setBhk] = useState("3 BHK");
  const [timeline, setTimeline] = useState("Within 1 - 3 Months");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanPhone = phone.trim().replace(/\D/g, "");

    if (!cleanName) {
      toast.error("Please enter your name");
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setIsSubmitting(true);

    const finalLocation = location === "Other" && customLocation.trim() ? customLocation.trim() : location;

    // 1. Save to Inquiries Store
    await addRequirement({
      name: cleanName,
      phone: cleanPhone,
      email: email.trim() || undefined,
      purpose,
      propertyType,
      location: finalLocation,
      budget,
      bhk,
      timeline,
      notes: notes.trim() || undefined,
    });

    // 2. Prepare Formatted WhatsApp Message
    const whatsappMessage = `🏡 *NEW PROPERTY REQUIREMENT - ROADFACING*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Name*: ${cleanName}
📞 *Phone*: +91 ${cleanPhone}
${email.trim() ? `📧 *Email*: ${email.trim()}\n` : ""}🎯 *Looking To*: ${purpose}
🏠 *Property Type*: ${propertyType}
📍 *Preferred City/Area*: ${finalLocation}
💰 *Budget*: ${budget}
🛏️ *Configuration*: ${bhk}
⏱️ *Timeline*: ${timeline}
${notes.trim() ? `📝 *Specific Notes*: ${notes.trim()}\n` : ""}━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Submitted via Road Facing Portal_`;

    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/91${WHATSAPP_NUMBER}?text=${encodedMessage}`;

    toast.success("Requirement posted! Connecting you to WhatsApp...");

    // 3. Open WhatsApp in new tab
    window.open(whatsappUrl, "_blank");

    setIsSubmitting(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col my-auto"
        >
          {/* Modal Header */}
          <div className="relative p-5 sm:p-7 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent shrink-0">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Custom Property Finder
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
              Post Your Requirement
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Tell us what you are looking for. We will match verified properties and connect with you directly on WhatsApp.
            </p>
          </div>

          {/* Form Body - Scrollable */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1 text-left">
            
            {/* Purpose Tabs */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
                I am looking to:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["Buy", "Rent", "Invest", "Commercial Lease"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPurpose(p)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl text-xs font-extrabold border transition-all cursor-pointer text-center",
                      purpose === p
                        ? "bg-amber-500 border-amber-500 text-slate-950 shadow-md font-black"
                        : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Property Type Grid */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-500" /> Property Type *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROPERTY_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPropertyType(type)}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left truncate",
                      propertyType === type
                        ? "bg-slate-950 dark:bg-white text-white dark:text-slate-950 border-slate-950 dark:border-white shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Location & BHK Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Location */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" /> Preferred City / Location *
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>

                {location === "Other" && (
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="Enter locality / area..."
                    className="w-full h-10 px-3 mt-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white outline-none"
                  />
                )}
              </div>

              {/* BHK / Configuration */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-500" /> Configuration
                </label>
                <select
                  value={bhk}
                  onChange={(e) => setBhk(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                >
                  {BHK_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Budget Range */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-amber-500" /> Expected Budget Range *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BUDGET_PRESETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBudget(b)}
                    className={cn(
                      "py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center truncate",
                      budget === b
                        ? "bg-amber-400 text-slate-950 border-amber-500 font-black shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400"
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Details (Name, Phone, Email) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                Your Contact Information
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-amber-500" /> Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-amber-500" /> Mobile / WhatsApp Number *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-extrabold text-slate-500 pointer-events-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="98765 43210"
                      className="w-full h-10 pl-11 pr-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Email (Optional) */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-amber-500" /> Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rajesh@example.com"
                  className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Timeline & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Possession / Buying Timeline
                </label>
                <select
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                >
                  {TIMELINES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                  Additional Notes / Specific Needs
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. East facing, gated community, swimming pool..."
                  className="w-full h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20bd5a] hover:to-[#0f7a6e] text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit & Connect on WhatsApp (+91 {WHATSAPP_NUMBER})</span>
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2">
                🔒 Free service. Your requirement will be instantly routed to our verified property advisors.
              </p>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
