import { NextResponse } from "next/server";
import { z } from "zod";
import { CONTACT_ACTIONS } from "@/lib/listing-actions";
import { recordListingAction } from "@/lib/listing-leads";
import { PortalError, portalError } from "@/lib/builder-access";
const schema = z.object({ listingType: z.enum(["project", "property"]), listingId: z.string().min(1).max(180), action: z.enum(CONTACT_ACTIONS), consent: z.literal(true) }).strict();
export async function POST(request: Request) {
  try {
    const body = schema.safeParse(await request.json());
    if (!body.success) throw new PortalError("Choose a listing action and confirm contact sharing.");
    const { listingType, listingId, action } = body.data;
    const result = await recordListingAction(request, listingType, listingId, action);
    return NextResponse.json({ success: true, phone: action === "brochure_download" ? undefined : result.phone, brochureUrl: action === "brochure_download" ? result.listing.brochureUrl : undefined, duplicate: result.duplicate }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof PortalError && error.status === 401) return NextResponse.json({ success: false, code: "AUTH_REQUIRED", error: error.message }, { status: 401 });
    return portalError(error);
  }
}
