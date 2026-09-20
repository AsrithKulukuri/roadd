import type { WhatsAppAPIResponse } from "@/types/auth";

export type WhatsAppMode = "disabled" | "mock" | "live";
export type WhatsAppProvider = "meta";

export interface WhatsAppSendOptions {
  recipientType?: "user" | "builder" | "admin";
  requestId?: string;
  templateName?: string;
  languageCode?: string;
  components?: Array<Record<string, any>>;
  fallbackText?: string;
  allowFreeformOnly?: boolean;
}

export interface WhatsAppExecutionResult extends WhatsAppAPIResponse {
  logRecorded?: boolean;
  statusCode?: number;
  retryAfterSeconds?: number;
  simulated?: boolean;
  errorCategory?:
    | "CONFIG_ERROR"
    | "AUTH_ERROR"
    | "RATE_LIMITED"
    | "INVALID_PHONE"
    | "PROVIDER_UNAVAILABLE"
    | "TIMEOUT"
    | "NETWORK_ERROR"
    | "POLICY_VIOLATION";
  durationMs?: number;
  provider?: WhatsAppProvider;
}

