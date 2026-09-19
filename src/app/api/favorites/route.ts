import { NextResponse } from "next/server";
import { leadUser, getActionListing } from "@/lib/listing-leads";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PortalError, portalError } from "@/lib/builder-access";
import { authenticateServerRequest } from "@/lib/server-auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await authenticateServerRequest(request);
    // Return empty favorites for unauthenticated visitors without triggering a 401 console error
    if (!auth.authorized || !auth.user) {
      return NextResponse.json(
        { success: true, ids: [], authenticated: false },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("user_saved_listings")
      .select("listing_id")
      .eq("user_id", auth.user.id);

    if (error) throw error;

    return NextResponse.json(
      { success: true, ids: data.map((row) => row.listing_id), authenticated: true },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return portalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await leadUser(request);
    const body = await request.json();
    if (typeof body.id !== "string" || typeof body.saved !== "boolean") {
      throw new PortalError("Invalid saved listing.");
    }

    if (body.saved) {
      let listing;
      try {
        listing = await getActionListing("project", body.id);
      } catch (error) {
        if (!(error instanceof PortalError && error.status === 404)) throw error;
        listing = await getActionListing("property", body.id);
      }
      const { error } = await supabaseAdmin
        .from("user_saved_listings")
        .upsert({ user_id: user.id, listing_id: String(listing.id) });
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("user_saved_listings")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", body.id);
      if (error) throw error;
    }

    return GET(request);
  } catch (error) {
    return portalError(error);
  }
}
