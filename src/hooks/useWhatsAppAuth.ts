"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { SendOTPResponse, VerifyOTPResponse, StructuredAPIError } from "@/types/auth";

const FRIENDLY_SERVICE_ERROR = "OTP service is temporarily unavailable. Please try again shortly.";

/**
 * Safely parse HTTP response, handling non-JSON (HTML/plain-text 502/504) Vercel/Cloudflare errors gracefully.
 */
async function parseSafeResponse<T>(
  response: Response
): Promise<{ ok: boolean; data: T | null; status: number }> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const json = await response.json();
      return { ok: response.ok, data: json, status: response.status };
    } catch {
      return { ok: false, data: null, status: response.status };
    }
  }

  // Safely consume non-JSON text without throwing SyntaxError
  try {
    await response.text();
  } catch {
    // Ignore body consumption errors
  }

  return { ok: false, data: null, status: response.status };
}

function extractErrorMessage(
  data: (SendOTPResponse & { error?: string | StructuredAPIError }) | null,
  status: number
): string {
  if (!data) {
    if (status === 429) return "Too many attempts. Please wait a moment before trying again.";
    if (status >= 500) return FRIENDLY_SERVICE_ERROR;
    return "Unable to connect to verification service. Please try again.";
  }

  if (typeof data.error === "string" && data.error.trim()) {
    // Suppress raw technical errors containing stack traces or IP addresses
    if (
      data.error.includes("connect EACCES") ||
      data.error.includes("Unexpected token") ||
      data.error.includes("Internal Server Error") ||
      data.error.includes("<html")
    ) {
      return FRIENDLY_SERVICE_ERROR;
    }
    return data.error;
  }

  if (data.error && typeof data.error === "object" && data.error.message) {
    return data.error.message;
  }

  if (data.message && typeof data.message === "string") {
    return data.message;
  }

  return FRIENDLY_SERVICE_ERROR;
}

export function useWhatsAppAuth() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // In-flight guard to prevent duplicate concurrent submissions
  const sendingLock = useRef(false);
  const verifyingLock = useRef(false);

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
    if (sendingLock.current) return false;
    sendingLock.current = true;
    setIsSending(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: targetPhone }),
        signal: controller.signal,
      }).catch((fetchErr) => {
        if (fetchErr?.name === "AbortError") {
          throw new Error("Request timed out. Please check your connection and try again.");
        }
        throw new Error(FRIENDLY_SERVICE_ERROR);
      });
      clearTimeout(timeoutId);

      const parsed = await parseSafeResponse<SendOTPResponse>(response);

      if (!parsed.ok || !parsed.data || !parsed.data.success) {
        const msg = extractErrorMessage(parsed.data, parsed.status);
        setError(msg);
        toast.error(msg);
        return false;
      }

      setPhone(targetPhone);
      setStep("otp");
      setResendTimer(parsed.data.retryAfterSeconds || 60);
      toast.success(parsed.data.message || "OTP sent successfully to your WhatsApp number!");
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : FRIENDLY_SERVICE_ERROR;
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setIsSending(false);
      sendingLock.current = false;
    }
  }, []);

  /**
   * Verify WhatsApp OTP
   */
  const verifyOTP = useCallback(
    async (submittedOTP?: string): Promise<VerifyOTPResponse | null> => {
      if (verifyingLock.current) return null;
      const targetOtp = submittedOTP || otp;
      if (!targetOtp || targetOtp.length !== 6) {
        setError("Please enter a valid 6-digit OTP code");
        return null;
      }

      verifyingLock.current = true;
      setIsVerifying(true);
      setError(null);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, otp: targetOtp }),
          signal: controller.signal,
        }).catch((fetchErr) => {
          if (fetchErr?.name === "AbortError") {
            throw new Error("Verification timed out. Please try again.");
          }
          throw new Error("Network error during OTP verification. Please try again.");
        });
        clearTimeout(timeoutId);

        const parsed = await parseSafeResponse<VerifyOTPResponse>(response);

        if (!parsed.ok || !parsed.data || !parsed.data.success) {
          const msg = extractErrorMessage(parsed.data, parsed.status);
          setError(msg);
          toast.error(msg);
          return null;
        }

        toast.success(parsed.data.message || "WhatsApp verification successful! Welcome to ROAD.");
        return parsed.data;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Network error during OTP verification. Please try again.";
        setError(msg);
        toast.error(msg);
        return null;
      } finally {
        setIsVerifying(false);
        verifyingLock.current = false;
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
    sendingLock.current = false;
    verifyingLock.current = false;
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
