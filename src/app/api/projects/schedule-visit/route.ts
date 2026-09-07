import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { WasenderService } from "@/lib/wasender";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";
import { sanitizeIndianPhoneNumber } from "@/lib/validations/auth";

export const dynamic = "force-dynamic";

const SUPPORT_WHATSAPP_PHONE = "+91 8977311418";
const MAX_BODY_BYTES = 12 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_VISITS_PER_WINDOW = 3;

const scheduleVisitRateMap = new Map<string, { count: number; resetAt: number }>();

const safeIdSchema = z
  .string()
  .trim()
  .max(160)
  .regex(/^[a-zA-Z0-9_-]*$/, "Invalid listing identifier")
  .optional()
  .default("");

const scheduleVisitSchema = z.object({
  projectId: safeIdSchema,
  projectSlug: safeIdSchema,
  projectName: z.string().trim().min(2, "Project name is required").max(180),
  projectLocation: z.string().trim().max(240).optional().default(""),
  customerName: z.string().trim().min(2, "Customer name is required").max(80),
  customerPhone: z
    .string()
    .trim()
    .transform((value) => sanitizeIndianPhoneNumber(value))
    .refine((value) => /^\+91[6-9]\d{9}$/.test(value), "Enter a valid Indian WhatsApp number"),
  customerEmail: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((value) => value || "")
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Enter a valid email address"),
  builderName: z.string().trim().max(120).optional().default(""),
  builderPhone: z.string().trim().max(40).optional().default(""),
  visitDate: z.string().trim().min(2, "Visit date is required").max(80),
  timeSlot: z.string().trim().min(2, "Time slot is required").max(80),
  notes: z.string().trim().max(500).optional().default(""),
});

type ScheduleVisitInput = z.infer<typeof scheduleVisitSchema>;

type ListingContact = {
  projectId: string;
  projectSlug: string;
  projectName: string;
  projectLocation: string;
  builderName: string;
  builderPhone: string;
};

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local-development"
  );
}

function checkScheduleVisitRateLimit(req: NextRequest, customerPhone: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  for (const [key, entry] of scheduleVisitRateMap.entries()) {
    if (entry.resetAt <= now) scheduleVisitRateMap.delete(key);
  }

  const key = `${getClientIp(req)}:${customerPhone}`;
  const existing = scheduleVisitRateMap.get(key);
  if (!existing || existing.resetAt <= now) {
    scheduleVisitRateMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (existing.count >= MAX_VISITS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true };
}

function normalizeLocation(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return "";
  const location = value as Record<string, unknown>;
  return [location.locality, location.city, location.address]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .join(", ");
}

function normalizeListingContact(record: Record<string, any>, fallback: ScheduleVisitInput): ListingContact {
  const builder = typeof record.builder === "object" && record.builder ? record.builder : {};
  const recordLocation =
    normalizeLocation(record.location) ||
    String(record.projectLocation || record.project_location || record.locationText || record.location_text || "");

  return {
    projectId: String(record.id || fallback.projectId || ""),
    projectSlug: String(record.slug || fallback.projectSlug || ""),
    projectName: String(record.name || record.title || fallback.projectName),
    projectLocation: recordLocation || fallback.projectLocation,
    builderName: String(
      record.builderName ||
        record.builder_name ||
        record.ownerName ||
        record.owner_name ||
        builder.name ||
        fallback.builderName ||
        "Project Site Team"
    ),
    builderPhone: String(
      record.builderWhatsapp ||
        record.builder_whatsapp ||
        record.builderPhone ||
        record.builder_phone ||
        record.ownerPhone ||
        record.owner_phone ||
        builder.whatsapp ||
        builder.phone ||
        ""
    ),
  };
}

async function getListingContact(input: ScheduleVisitInput): Promise<ListingContact | null> {
  const findInTable = async (table: "projects" | "properties") => {
    if (input.projectId) {
      const { data } = await supabaseAdmin.from(table).select("*").eq("id", input.projectId).maybeSingle();
      if (data) return data as Record<string, any>;
    }
    if (input.projectSlug) {
      const { data } = await supabaseAdmin.from(table).select("*").eq("slug", input.projectSlug).maybeSingle();
      if (data) return data as Record<string, any>;
    }
    return null;
  };

  try {
    const project = await findInTable("projects");
    if (project) return normalizeListingContact(project, input);

    const property = await findInTable("properties");
    if (property) return normalizeListingContact(property, input);
  } catch (error) {
    console.warn("[SCHEDULE VISIT] Listing lookup skipped:", error);
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get("content-length") || "0");
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { success: false, error: "Schedule request is too large" },
        { status: 413 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = scheduleVisitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid schedule request" },
        { status: 400 }
      );
    }

    const {
      projectId,
      projectSlug,
      projectName,
      projectLocation,
      customerName,
      customerPhone,
      customerEmail,
      builderName,
      visitDate,
      timeSlot,
      notes,
    } = parsed.data;

    const cleanCustomerPhone = formatWhatsAppPhone(customerPhone);
    const rateLimit = checkScheduleVisitRateLimit(req, cleanCustomerPhone);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many site visit requests. Please try again later.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const listingContact = await getListingContact(parsed.data);
    const resolvedProjectId = listingContact?.projectId || projectId;
    const resolvedProjectSlug = listingContact?.projectSlug || projectSlug;
    const resolvedProjectName = listingContact?.projectName || projectName;
    const resolvedProjectLocation = listingContact?.projectLocation || projectLocation || "Vijayawada / Amaravati";
    const resolvedBuilderName = listingContact?.builderName || builderName || "Project Site Team";
    const cleanBuilderPhone = listingContact?.builderPhone ? formatWhatsAppPhone(listingContact.builderPhone) : "";

    const scheduleId = `visit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const createdAt = new Date().toISOString();

    let customerNotified = false;
    let builderNotified = false;

    // 1. Send WhatsApp notification to Customer
    try {
      const customerMsg =
        `Hello ${customerName}! 🏡\n\n` +
        `Your site visit for *${resolvedProjectName}* is *CONFIRMED*!\n\n` +
        `📅 *Date:* ${visitDate}\n` +
        `⏰ *Time Slot:* ${timeSlot}\n` +
        `📍 *Location:* ${resolvedProjectLocation || "Project Site"}\n\n` +
        `Our project team will be ready to guide you through the property. We will also send you a reminder 1 hour before your visit.\n\n` +
        `Thank you for using ROAD Facing!`;

      if (cleanCustomerPhone) {
        const custResult = await WasenderService.sendTextMessage(cleanCustomerPhone, customerMsg, {
          requestId: `sched-cust-${scheduleId}`,
        });
        customerNotified = custResult.success;
      }
    } catch (msgErr) {
      console.warn("[SCHEDULE VISIT] Failed to send WhatsApp to customer:", msgErr);
    }

    // 2. Send WhatsApp notification to Builder
    try {
      const targetBuilderPhone = cleanBuilderPhone || formatWhatsAppPhone(SUPPORT_WHATSAPP_PHONE);
      if (targetBuilderPhone) {
        const builderMsg =
          `New Site Visit Scheduled! 🔔\n\n` +
          `Project: *${resolvedProjectName}*\n` +
          `Customer: *${customerName}*\n` +
          `Phone: ${cleanCustomerPhone}\n` +
          (customerEmail ? `Email: ${customerEmail}\n` : "") +
          `📅 *Date:* ${visitDate}\n` +
          `⏰ *Time Slot:* ${timeSlot}\n` +
          `📍 *Location:* ${resolvedProjectLocation || "Site"}\n` +
          (notes ? `📝 *Notes:* ${notes}\n` : "") +
          `\nPlease ensure a site executive is available for the visit.\n\n` +
          `ROAD Facing Admin`;

        const bldResult = await WasenderService.sendTextMessage(targetBuilderPhone, builderMsg, {
          requestId: `sched-bld-${scheduleId}`,
        });
        builderNotified = bldResult.success;
      }
    } catch (bldErr) {
      console.warn("[SCHEDULE VISIT] Failed to send WhatsApp to builder:", bldErr);
    }

    // 3. Save to Supabase (primary project_site_visits + backup project_leads)
    if (supabaseAdmin) {
      try {
        const { error: insertErr } = await supabaseAdmin.from("project_site_visits").insert({
          id: scheduleId,
          project_id: resolvedProjectId || null,
          project_slug: resolvedProjectSlug || null,
          project_name: resolvedProjectName,
          project_location: resolvedProjectLocation || null,
          customer_name: customerName,
          customer_phone: cleanCustomerPhone,
          customer_email: customerEmail || null,
          builder_name: resolvedBuilderName || null,
          builder_phone: cleanBuilderPhone || null,
          visit_date: visitDate,
          time_slot: timeSlot,
          status: "scheduled",
          customer_notified: customerNotified,
          builder_notified: builderNotified,
          reminder_sent: false,
          notes: notes || null,
          created_at: createdAt,
        });

        if (insertErr) {
          console.warn("[SCHEDULE VISIT] Supabase project_site_visits insert warning:", insertErr.message || insertErr);
        }
      } catch (dbErr) {
        console.warn("[SCHEDULE VISIT] Supabase insert skipped or table not present:", dbErr);
      }

      // Dual-record in project_leads as reliable failover so visits are never lost
      try {
        await supabaseAdmin.from("project_leads").insert({
          project_id: resolvedProjectId || null,
          project_slug: resolvedProjectSlug || null,
          project_name: resolvedProjectName,
          builder_phone: cleanBuilderPhone || "site-team",
          builder_whatsapp: cleanBuilderPhone || null,
          viewer_name: customerName,
          viewer_phone: cleanCustomerPhone,
          viewer_email: customerEmail || null,
          delivery_status: `scheduled_visit:${visitDate}:${timeSlot}`,
          created_at: createdAt,
        });
      } catch (leadErr) {
        console.warn("[SCHEDULE VISIT] project_leads fallback record skipped:", leadErr);
      }
    }

    const schedule = {
      id: scheduleId,
      projectId: resolvedProjectId || "",
      projectSlug: resolvedProjectSlug || "",
      projectName: resolvedProjectName,
      projectLocation: resolvedProjectLocation || "",
      customerName,
      customerPhone: cleanCustomerPhone,
      customerEmail,
      builderName: resolvedBuilderName,
      builderPhone: cleanBuilderPhone,
      visitDate,
      timeSlot,
      status: "scheduled" as const,
      customerNotified,
      builderNotified,
      reminderSent: false,
      notes,
      createdAt,
    };

    return NextResponse.json({
      success: true,
      schedule,
      customerNotified,
      builderNotified,
      message: "Site visit scheduled successfully",
    });
  } catch (error: any) {
    console.error("[SCHEDULE VISIT API ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
