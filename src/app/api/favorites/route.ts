import { NextResponse } from "next/server";
import { leadUser, getActionListing } from "@/lib/listing-leads";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PortalError, portalError } from "@/lib/builder-access";
export async function GET(request: Request) {
  try {
    const user = await leadUser(request);
    const { data, error } = await supabaseAdmin.from("user_saved_listings").select("listing_id").eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ success: true, ids: data.map(row => row.listing_id) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return portalError(error); }
}
export async function POST(request: Request) {
  try {
    const user = await leadUser(request);
    const body = await request.json();
    if (typeof body.id !== "string" || typeof body.saved !== "boolean") throw new PortalError("Invalid saved listing.");
    if (body.saved) {
      let listing;
      try { listing = await getActionListing("project", body.id); }
      catch (error) { if (!(error instanceof PortalError && error.status === 404)) throw error; listing = await getActionListing("property", body.id); }
      const { error } = await supabaseAdmin.from("user_saved_listings").upsert({ user_id: user.id, listing_id: String(listing.id) });
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("user_saved_listings").delete().eq("user_id", user.id).eq("listing_id", body.id);
      if (error) throw error;
    }
    return GET(request);
  } catch (error) { return portalError(error); }
}
