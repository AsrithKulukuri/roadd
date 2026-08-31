/**
 * WhatsApp OTP Authentication System Types
 */

export interface StructuredAPIError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

export interface SendOTPRequest {
  phone: string;
}

export interface SendOTPResponse {
  success: boolean;
  message?: string;
  expiresInSeconds?: number;
  requestId?: string;
  error?: string | StructuredAPIError;
  retryAfterSeconds?: number;
}

export interface VerifyOTPRequest {
  phone: string;
  otp: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  isProfileComplete?: boolean;
  message?: string;
  requestId?: string;
  user?: {
    id: string;
    phone: string;
    name?: string;
    email?: string;
    role: string;
  };
  session?: {
    accessToken: string;
    refreshToken: string;
  };
  error?: string | StructuredAPIError;
}

export interface APIErrorResponse {
  success: false;
  error: string | StructuredAPIError;
  code?: string;
  requestId?: string;
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
