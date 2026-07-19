"use client";

import { useState } from "react";
import { X, Calendar as CalendarIcon, Clock, MapPin, User, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface TourBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyName: string;
  propertyLocation: string;
}

export function TourBookingModal({ isOpen, onClose, propertyName, propertyLocation }: TourBookingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate next 14 days
  const upcomingDates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const timeSlots = ["10:00 AM", "11:30 AM", "01:00 PM", "03:30 PM", "05:00 PM"];

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep(2);
    }, 1500);
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg bg-bg-card border border-border-default rounded-3xl p-6 md:p-8 shadow-2xl z-50 overflow-y-auto max-h-[90vh]"
          >
            <button
              onClick={resetAndClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-bg-primary text-text-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {step === 1 ? (
              <div>
                <div className="mb-8">
                  <h2 className="font-heading text-2xl font-bold text-text-primary mb-2">Schedule a Tour</h2>
                  <p className="text-text-secondary text-sm">
                    Book an in-person or virtual tour for <span className="text-amber-primary font-medium">{propertyName}</span>
                  </p>
                </div>

                <form onSubmit={handleBooking} className="space-y-8">
                  {/* Date Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-amber-primary" /> Select a Date
                    </label>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {upcomingDates.map((date, i) => {
                        const isSelected = selectedDate?.toDateString() === date.toDateString();
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedDate(date)}
                            className={`flex flex-col items-center justify-center min-w-[72px] h-20 rounded-2xl border transition-all ${
                              isSelected 
                                ? 'bg-amber-primary text-bg-primary border-amber-primary shadow-amber-glow' 
                                : 'bg-bg-primary border-border-default text-text-secondary hover:border-amber-primary/50'
                            }`}
                          >
                            <span className="text-xs font-medium uppercase tracking-wider">{format(date, "EEE")}</span>
                            <span className="text-xl font-bold mt-0.5">{format(date, "d")}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-primary" /> Select a Time
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {timeSlots.map((time, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                            selectedTime === time
                              ? 'bg-amber-primary/10 border-amber-primary text-amber-primary'
                              : 'bg-bg-primary border-border-default text-text-secondary hover:border-amber-primary/50'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-primary" /> Your Details
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <Input placeholder="First Name" required className="bg-bg-primary" />
                      <Input placeholder="Last Name" required className="bg-bg-primary" />
                    </div>
                    <Input type="email" placeholder="Email Address" required className="bg-bg-primary" />
                    <Input type="tel" placeholder="Phone Number" required className="bg-bg-primary" />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={!selectedDate || !selectedTime || isSubmitting}
                    className="w-full h-12 text-lg rounded-xl shadow-amber-glow"
                  >
                    {isSubmitting ? "Confirming..." : "Confirm Booking"}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="font-heading text-3xl font-bold text-text-primary mb-3">Tour Confirmed!</h2>
                <p className="text-text-secondary mb-8 leading-relaxed">
                  Your tour for <span className="text-white font-medium">{propertyName}</span> has been scheduled for<br/>
                  <span className="text-amber-primary font-bold">{selectedDate && format(selectedDate, "EEEE, MMMM d")} at {selectedTime}</span>
                </p>
                <div className="flex items-center gap-2 text-sm text-text-tertiary bg-bg-primary px-4 py-3 rounded-xl border border-border-default">
                  <MapPin className="w-4 h-4" />
                  {propertyLocation}
                </div>
                <Button onClick={resetAndClose} variant="outline" className="mt-8 w-full h-12 rounded-xl">
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
