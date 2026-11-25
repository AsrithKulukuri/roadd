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

    const currentUser = auth.user;
    const userIds = [currentUser.id];
    if (currentUser.phone) {
      const p10 = currentUser.phone.replace(/\D/g, "").slice(-10);
      if (p10) {
        userIds.push(`wa_91${p10}`, `wa_${p10}`);
      }
    }
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

    const { data, error } = await supabaseAdmin
      .from("user_saved_listings")
      .select("listing_id")
      .in("user_id", uniqueUserIds);

    if (error) throw error;

    let listingIds = (data || []).map((row) => row.listing_id);

    // Fallback/backfill check: If empty and user has a valid UUID, check legacy saved_properties
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUuid = uniqueUserIds.find((id) => uuidRegex.test(id));
    if (listingIds.length === 0 && validUuid) {
      try {
        const { data: legacySaved } = await supabaseAdmin
          .from("saved_properties")
          .select("property_id")
          .eq("user_id", validUuid);

        if (legacySaved && legacySaved.length > 0) {
          const legacyIds = legacySaved
            .map((r) => String(r.property_id))
            .filter(Boolean);
          if (legacyIds.length > 0) {
            const backfillRows = legacyIds.map((lid) => ({
              user_id: currentUser.id,
              listing_id: lid,
            }));
            await supabaseAdmin
              .from("user_saved_listings")
              .upsert(backfillRows, { onConflict: "user_id,listing_id" });
            listingIds = legacyIds;
          }
        }
      } catch (backfillErr) {
        console.warn("[Favorites] Legacy backfill notice:", backfillErr);
      }
    }

    return NextResponse.json(
      { success: true, ids: Array.from(new Set(listingIds)), authenticated: true },
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

    const userIds = [user.id];
    if (user.phone) {
      const p10 = user.phone.replace(/\D/g, "").slice(-10);
      if (p10) {
        userIds.push(`wa_91${p10}`, `wa_${p10}`);
      }
    }
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

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
        .upsert(
          { user_id: user.id, listing_id: String(listing.id) },
          { onConflict: "user_id,listing_id" }
        );
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("user_saved_listings")
        .delete()
        .in("user_id", uniqueUserIds)
        .eq("listing_id", body.id);
      if (error) throw error;

      // Clean up legacy saved_properties if applicable
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validUuid = uniqueUserIds.find((id) => uuidRegex.test(id));
      if (validUuid) {
        try {
          await supabaseAdmin
            .from("saved_properties")
            .delete()
            .eq("user_id", validUuid)
            .eq("property_id", body.id);
        } catch {}
      }
    }

    return GET(request);
  } catch (error) {
    return portalError(error);
  }
}
