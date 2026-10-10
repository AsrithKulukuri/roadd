import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      phone,
      email,
      notifyType = "launch_alert",
      projectName,
      projectId,
      location,
      bhk,
      // Anti-bot honeypot
      websiteTrap,
    } = body;

    // Spam / Bot Protection: If the hidden honeypot field is filled, silently return 200
    if (websiteTrap && websiteTrap.trim().length > 0) {
      return NextResponse.json({
        success: true,
        message: "Notification preference recorded.",
        botTrapped: true,
      });
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Please enter your name." },
        { status: 400 }
      );
    }

    const cleanPhone = (phone || "").replace(/[\s-]/g, "");
    if (!cleanPhone || !/^\+?[0-9]{10,14}$/.test(cleanPhone)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Attempt to insert into listing_leads or inquiries
        await supabase.from("listing_leads").insert([
          {
            name: name.trim(),
            phone: cleanPhone,
            email: email?.trim() || null,
            message: `[Notify Me Alert] Type: ${notifyType} | Project: ${projectName || "General"} | BHK: ${bhk || "Any"} | Location: ${location || "AP Region"}`,
            source: "notify_me_alert",
            project_id: projectId || null,
            status: "new",
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (dbErr) {
        // Table fallback: log error, don't crash
        console.warn("Could not insert notify lead into database:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `You're all set! We will notify you via WhatsApp at ${cleanPhone} when updates go live.`,
    });
  } catch (error: any) {
    console.error("Notify Me API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save notification preference. Please try again." },
      { status: 500 }
    );
  }
}
