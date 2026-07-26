/**
 * WhatsApp OTP Authentication System Types
 */

export interface SendOTPRequest {
  phone: string;
}

export interface SendOTPResponse {
  success: boolean;
  message: string;
  expiresInSeconds: number;
}

export interface VerifyOTPRequest {
  phone: string;
  otp: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    phone: string;
    email?: string;
    role: string;
  };
  session?: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface APIErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string>;
}

export interface WasenderSendMessagePayload {
  to: string;
  message: string;
}

export interface WasenderAPIResponse {
  success: boolean;
  message?: string;
  id?: string;
  error?: string;
}

export interface PhoneOTPRecord {
  id: string;
  phone: string;
  otp_hash: string;
  expires_at: string;
  attempts: number;
  verified: boolean;
  created_at: string;
}
