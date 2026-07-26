"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { SendOTPResponse, VerifyOTPResponse } from "@/types/auth";

export function useWhatsAppAuth() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Handle Resend Countdown Timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  /**
   * Request WhatsApp OTP
   */
  const sendOTP = useCallback(async (targetPhone: string): Promise<boolean> => {
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: targetPhone }),
      });

      const data: SendOTPResponse & { error?: string } = await response.json();

      if (!response.ok || !data.success) {
        const msg = data.error || "Failed to send WhatsApp OTP.";
        setError(msg);
        toast.error(msg);
        return false;
      }

      setPhone(targetPhone);
      setStep("otp");
      setResendTimer(60); // 60s cooldown
      toast.success(data.message || "OTP sent successfully to your WhatsApp number!");
      return true;
    } catch (err: any) {
      const msg = err?.message || "Network error. Please try again.";
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setIsSending(false);
    }
  }, []);

  /**
   * Verify WhatsApp OTP
   */
  const verifyOTP = useCallback(
    async (submittedOTP?: string): Promise<VerifyOTPResponse | null> => {
      const targetOtp = submittedOTP || otp;
      if (!targetOtp || targetOtp.length !== 6) {
        setError("Please enter a valid 6-digit OTP code");
        return null;
      }

      setIsVerifying(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, otp: targetOtp }),
        });

        const data: VerifyOTPResponse & { error?: string } = await response.json();

        if (!response.ok || !data.success) {
          const msg = data.error || "Invalid OTP code.";
          setError(msg);
          toast.error(msg);
          return null;
        }

        toast.success("WhatsApp verification successful! Welcome to ROAD.");
        return data;
      } catch (err: any) {
        const msg = err?.message || "Network error during OTP verification.";
        setError(msg);
        toast.error(msg);
        return null;
      } finally {
        setIsVerifying(false);
      }
    },
    [phone, otp]
  );

  /**
   * Reset auth state to start over
   */
  const reset = useCallback(() => {
    setStep("phone");
    setPhone("");
    setOtp("");
    setError(null);
    setResendTimer(0);
  }, []);

  return {
    step,
    phone,
    otp,
    setPhone,
    setOtp,
    isSending,
    isVerifying,
    isLoading: isSending || isVerifying,
    resendTimer,
    canResend: resendTimer === 0,
    error,
    sendOTP,
    verifyOTP,
    reset,
  };
}
