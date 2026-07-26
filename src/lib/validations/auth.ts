import { z } from "zod";

/**
 * Clean and format Indian phone numbers into standard E.164 (+91XXXXXXXXXX) format.
 */
export function sanitizeIndianPhoneNumber(phoneInput: string): string {
  if (!phoneInput) return "";
  
  // Remove all non-numeric characters
  let digits = phoneInput.replace(/\D/g, "");

  // If user included leading 91, strip it first if total length is 12
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.substring(2);
  }

  // If user included leading 0, strip it if length is 11
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.substring(1);
  }

  return `+91${digits}`;
}

/**
 * Zod Schema for Indian Phone Number Validation
 */
export class IndianPhoneSchema {
  static readonly schema = z.object({
    phone: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .transform((val) => sanitizeIndianPhoneNumber(val))
      .refine(
        (val) => /^\+91[6-9]\d{9}$/.test(val),
        {
          message: "Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)",
        }
      ),
  });
}

/**
 * Zod Schema for Send OTP Request
 */
export const sendOTPSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .transform((val) => sanitizeIndianPhoneNumber(val))
    .refine(
      (val) => /^\+91[6-9]\d{9}$/.test(val),
      {
        message: "Please enter a valid 10-digit Indian mobile number",
      }
    ),
});

/**
 * Zod Schema for Verify OTP Request
 */
export const verifyOTPSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .transform((val) => sanitizeIndianPhoneNumber(val))
    .refine(
      (val) => /^\+91[6-9]\d{9}$/.test(val),
      {
        message: "Please enter a valid 10-digit Indian mobile number",
      }
    ),
  otp: z
    .string()
    .trim()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain numbers only"),
});
