import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, propertyId, refId, source = "whatsapp", metadata = {} } = body;

    if (!eventType) {
      return NextResponse.json({ success: false, error: "Event type is required" }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Optionally increment counter in property table if column exists
    if (propertyId && (eventType === "property_whatsapp_share" || eventType === "property_whatsapp_click")) {
      try {
        // Try logging to an events / activity table if available
        await supabase.from("activity_logs").insert([
          {
            event_type: eventType,
            entity_id: propertyId,
            ref_id: refId,
            source,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch {}
    }

    return NextResponse.json({ success: true, recorded: true });
  } catch (error: any) {
    return NextResponse.json({ success: true, recorded: false });
  }
}
