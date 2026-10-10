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

    // Record real analytics event into activity_logs
    if (supabase) {
      try {
        await supabase.from("activity_logs").insert([
          {
            event_type: eventType,
            entity_id: propertyId || refId || null,
            source,
            metadata: typeof metadata === "object" ? metadata : {},
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (logErr) {
        // Fallback: don't block user experience if analytics table is temporarily busy
      }
    }

    return NextResponse.json({ success: true, recorded: true });
  } catch (error: any) {
    return NextResponse.json({ success: true, recorded: false });
  }
}
