import { createHash } from "node:crypto";

export interface WhatsAppTelemetryEvent {
  wamid?: string;
  hashedPhone: string;
  language: string;
  intent: string;
  answeringPath: "compliance" | "rule" | "search" | "llm" | "agent";
  latencyMs: number;
  resultCount: number;
  sendStatus: "sent" | "failed" | "skipped";
  errorCode?: string;
  timestamp?: string;
}

export interface ConciergeMetricsSnapshot {
  totalLogged: number;
  p95LatencyMs: number;
  avgLatencyMs: number;
  llmFallbackRate: number;
  sendFailureRate: number;
  activeAlerts: string[];
}

const BUFFER_MAX_SIZE = 100;
const rollingTelemetryBuffer: WhatsAppTelemetryEvent[] = [];

/**
 * Anonymizes phone numbers using SHA-256 for DPDP privacy compliance.
 */
export function hashPhoneNumber(phone: string): string {
  if (!phone) return "anonymous";
  return createHash("sha256").update(phone.trim()).digest("hex").slice(0, 12);
}

/**
 * Records structured telemetry for an inbound/outbound WhatsApp turn.
 * Evaluates performance metrics and emits structured alerts if SLAs are breached.
 */
export function recordConciergeTelemetry(event: Omit<WhatsAppTelemetryEvent, "timestamp">): void {
  const fullEvent: WhatsAppTelemetryEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  rollingTelemetryBuffer.push(fullEvent);
  if (rollingTelemetryBuffer.length > BUFFER_MAX_SIZE) {
    rollingTelemetryBuffer.shift();
  }

  // Structured Log Output
  console.log(`[CONCIERGE METRIC] path=${fullEvent.answeringPath} intent=${fullEvent.intent} latency=${fullEvent.latencyMs}ms results=${fullEvent.resultCount} status=${fullEvent.sendStatus} phone=${fullEvent.hashedPhone}`);

  // Evaluate SLA Alert Thresholds on rolling window
  if (rollingTelemetryBuffer.length >= 10) {
    const latencies = rollingTelemetryBuffer.map((e) => e.latencyMs).sort((a, b) => a - b);
    const p95Idx = Math.floor(latencies.length * 0.95);
    const p95 = latencies[p95Idx] || 0;

    const llmCount = rollingTelemetryBuffer.filter((e) => e.answeringPath === "llm").length;
    const llmRate = llmCount / rollingTelemetryBuffer.length;

    const failedCount = rollingTelemetryBuffer.filter((e) => e.sendStatus === "failed").length;
    const failRate = failedCount / rollingTelemetryBuffer.length;

    if (p95 > 3000) {
      console.warn(`[ALERT: HIGH P95 LATENCY] Current P95 latency is ${p95}ms (exceeds 3000ms SLA target)!`);
    }

    if (failRate > 0.05) {
      console.warn(`[ALERT: ELEVATED SEND FAILURES] Meta send failure rate is ${(failRate * 100).toFixed(1)}% (exceeds 5% threshold)!`);
    }
  }
}

/**
 * Computes a snapshot of recent concierge health metrics.
 */
export function getConciergeMetrics(): ConciergeMetricsSnapshot {
  if (rollingTelemetryBuffer.length === 0) {
    return {
      totalLogged: 0,
      p95LatencyMs: 0,
      avgLatencyMs: 0,
      llmFallbackRate: 0,
      sendFailureRate: 0,
      activeAlerts: [],
    };
  }

  const latencies = rollingTelemetryBuffer.map((e) => e.latencyMs).sort((a, b) => a - b);
  const p95Idx = Math.floor(latencies.length * 0.95);
  const p95 = latencies[p95Idx] || 0;
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  const llmCount = rollingTelemetryBuffer.filter((e) => e.answeringPath === "llm").length;
  const llmRate = llmCount / rollingTelemetryBuffer.length;

  const failedCount = rollingTelemetryBuffer.filter((e) => e.sendStatus === "failed").length;
  const failRate = failedCount / rollingTelemetryBuffer.length;

  const activeAlerts: string[] = [];
  if (p95 > 3000) activeAlerts.push(`P95 Latency ${p95}ms > 3000ms`);
  if (failRate > 0.05) activeAlerts.push(`Failure Rate ${(failRate * 100).toFixed(1)}% > 5%`);

  return {
    totalLogged: rollingTelemetryBuffer.length,
    p95LatencyMs: p95,
    avgLatencyMs: avg,
    llmFallbackRate: Number(llmRate.toFixed(3)),
    sendFailureRate: Number(failRate.toFixed(3)),
    activeAlerts,
  };
}

