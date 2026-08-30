"use client";

import { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon, Clock, MapPin, User, CheckCircle2, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useRouter } from "next/navigation";

interface TourBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyName: string;
  propertyLocation: string;
}

export function TourBookingModal({ isOpen, onClose, propertyName, propertyLocation }: TourBookingModalProps) {
  const router = useRouter();
  const { isLoggedIn, user, getLoginUrl } = useAuthSession();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (isLoggedIn && user) {
      const parts = (user.name || "").trim().split(" ");
      setFormData({
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ") || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [isLoggedIn, user]);

  // Generate next 14 days
  const upcomingDates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const timeSlots = ["10:00 AM", "11:30 AM", "01:00 PM", "03:30 PM", "05:00 PM"];

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      onClose();
      router.push(getLoginUrl());
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep(2);
    }, 1200);
  };

  const resetAndClose = () => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setSelectedDate(null);
      setSelectedTime(null);
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl z-50 overflow-y-auto max-h-[90vh]"
          >
            <button
              onClick={resetAndClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {step === 1 ? (
              <div>
                <div className="mb-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-xs rounded-full border border-amber-500/30 mb-2">
                    <CalendarIcon className="w-3.5 h-3.5" /> Free Site Visit
                  </span>
                  <h2 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-1">
                    Schedule a Private Site Visit
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                    Book an in-person or video walkthrough for{" "}
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{propertyName}</span>
                  </p>
                </div>

                <form onSubmit={handleBooking} className="space-y-6">
                  {/* Date Selection */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <CalendarIcon className="w-3.5 h-3.5 text-amber-500" /> Select a Date
                    </label>
                    <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none touch-pan-x">
                      {upcomingDates.map((date, i) => {
                        const isSelected = selectedDate?.toDateString() === date.toDateString();
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedDate(date)}
                            className={`flex flex-col items-center justify-center min-w-[68px] h-18 rounded-2xl border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md font-bold"
                                : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500/50"
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              {format(date, "EEE")}
                            </span>
                            <span className="text-lg font-black mt-0.5">{format(date, "d")}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Selection */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-500" /> Select a Time
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((time, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            selectedTime === time
                              ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                              : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500/50"
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-amber-500" /> Your Details
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="First Name"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="bg-white dark:bg-slate-950 h-11 text-xs"
                      />
                      <Input
                        placeholder="Last Name"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="bg-white dark:bg-slate-950 h-11 text-xs"
                      />
                    </div>
                    <Input
                      type="email"
                      placeholder="Email Address"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-white dark:bg-slate-950 h-11 text-xs"
                    />
                    <Input
                      type="tel"
                      placeholder="Phone Number (+91 ...)"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-white dark:bg-slate-950 h-11 text-xs"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!selectedDate || !selectedTime || isSubmitting}
                    className="w-full h-13 text-base font-black bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-full shadow-lg cursor-pointer"
                  >
                    {!isLoggedIn ? (
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4" /> Sign In to Confirm Booking
                      </span>
                    ) : isSubmitting ? (
                      "Confirming Site Visit..."
                    ) : (
                      "Confirm Site Visit Booking"
                    )}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mb-5 border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Site Visit Confirmed!
                </h2>
                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mb-6 leading-relaxed">
                  Your private tour for <span className="font-bold text-slate-900 dark:text-white">{propertyName}</span> has been scheduled for<br />
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold text-sm sm:text-base">
                    {selectedDate && format(selectedDate, "EEEE, MMMM d")} at {selectedTime}
                  </span>
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{propertyLocation}</span>
                </div>
                <Button
                  onClick={resetAndClose}
                  className="mt-6 w-full h-11 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
                >
                  Done
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

