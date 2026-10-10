import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { 
  decodeSubscriptionPayload, 
  encodeSubscriptionPayload, 
  calculateSubscriptionDetails 
} from "@/lib/builder-subscription";
import { sendBuilderExpiryWarningWhatsApp } from "@/lib/whatsapp/builder-notifications";

export async function GET(request: Request) {
  return handleReminders(request);
}

export async function POST(request: Request) {
  return handleReminders(request);
}

async function handleReminders(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    // In production, can check CRON_SECRET if configured:
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Optional check for external automated callers
    }

    const { data: builders, error } = await supabaseAdmin
      .from("builder_profiles")
      .select("*");

    if (error) throw error;

    const results: Array<{
      builderId: string;
      companyName: string;
      daysRemaining: number;
      expiryDate: string;
      phone: string;
      status: "sent" | "skipped_already_reminded" | "skipped_no_phone" | "skipped_not_expiring";
    }> = [];

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (const b of builders || []) {
      const decoded = decodeSubscriptionPayload(b.login_credentials_hint);
      const sub = calculateSubscriptionDetails(decoded.subscription, b.created_at);

      // Check if within 7-day expiration window
      if (sub.daysRemaining > 0 && sub.daysRemaining <= 7) {
        const phone = b.whatsapp_number || b.contact_phone;
        if (!phone) {
          results.push({
            builderId: b.id,
            companyName: b.company_name,
            daysRemaining: sub.daysRemaining,
            expiryDate: sub.endDate,
            phone: "",
            status: "skipped_no_phone",
          });
          continue;
        }

        // Avoid re-sending multiple times in the same 24 hours
        if (sub.whatsappRemindedAt) {
          const lastRemindedMs = new Date(sub.whatsappRemindedAt).getTime();
          if (now - lastRemindedMs < oneDayMs) {
            results.push({
              builderId: b.id,
              companyName: b.company_name,
              daysRemaining: sub.daysRemaining,
              expiryDate: sub.endDate,
              phone,
              status: "skipped_already_reminded",
            });
            continue;
          }
        }

        // Dispatch 7-day warning
        try {
          await sendBuilderExpiryWarningWhatsApp({
            builderId: b.id,
            companyName: b.company_name,
            phone,
            daysRemaining: sub.daysRemaining,
            expiryDate: sub.endDate,
          });

          // Update reminded timestamp
          const updatedSub = {
            ...decoded.subscription,
            whatsappRemindedAt: new Date().toISOString(),
          };

          await supabaseAdmin
            .from("builder_profiles")
            .update({
              login_credentials_hint: encodeSubscriptionPayload({
                subscription: updatedSub,
                credentialsHint: decoded.credentialsHint,
                password: decoded.password,
              }),
            })
            .eq("id", b.id);

          results.push({
            builderId: b.id,
            companyName: b.company_name,
            daysRemaining: sub.daysRemaining,
            expiryDate: sub.endDate,
            phone,
            status: "sent",
          });
        } catch (err) {
          console.error(`Failed to send 7-day warning to builder ${b.id}:`, err);
        }
      } else {
        results.push({
          builderId: b.id,
          companyName: b.company_name,
          daysRemaining: sub.daysRemaining,
          expiryDate: sub.endDate,
          phone: b.contact_phone || "",
          status: "skipped_not_expiring",
        });
      }
    }

    const sentCount = results.filter(r => r.status === "sent").length;

    return NextResponse.json({
      success: true,
      message: `Subscription check completed. Sent ${sentCount} 7-day warning alert(s).`,
      sentCount,
      totalChecked: results.length,
      details: results,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
