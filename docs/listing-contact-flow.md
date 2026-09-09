# Listing contact flow

Property and project browsing is public. An existing WhatsApp OTP modal opens only when an anonymous buyer takes a protected action, then resumes that action after the server confirms the session. Cancelling login does not submit the action.

| Action | Login required | Builder/agent and admin receive details |
| --- | --- | --- |
| Open listing, gallery, specifications, map or tour video | No | No |
| Save listing | Yes | No; saved privately |
| Reveal number | Yes, including an explicit click for existing sessions | Yes |
| WhatsApp builder/agent | Yes | Yes; records the click, not proof that the buyer sent a WhatsApp message |
| Request callback | Yes | Yes |
| Request brochure | Yes | Yes; records the request, not proof of a completed download |
| Open schedule form | Yes | No |
| Confirm site visit | Yes | Yes, after the visit is stored |

Contact requests use the authenticated profile name, phone and email when provided. Recipients come from the stored listing and server configuration, not request-body phone numbers. Each enquiry includes listing, action and time. Visit requests also include selected date, time slot and notes.

## Dashboard locations

- Admin: /admin/inquiries → Listing contact enquiries.
- Builder: /builder → Listing contact enquiries, restricted on the server to assigned projects.
- Confirmed visits continue to appear in /admin/schedules and /builder/schedules.
- Property owners receive WhatsApp notifications through the stored owner contact. Builder dashboard access to property leads is not inferred from a matching phone number.

The enquiry table shows whether the messaging provider accepted each notification. "Not sent" requires follow-up; it is not a delivery/read receipt. Repeating the same contact action on the same listing does not resend messages within the same UTC day. Site visits use a deterministic ID for user, listing, date and slot to prevent duplicate submissions.

## Deployment

1. Apply supabase/migrations/20260910_listing_action_leads.sql alongside this application release. It creates the protected enquiry and saved-listing tables, migrates existing saved_properties, and removes direct browser SELECT access to projects/properties. Public reads now use /api/listings; admin reads require server authorization.
2. Configure ADMIN_WHATSAPP_PHONE on the server with the intended admin recipient. This variable is currently absent locally; the code does not substitute an arbitrary number.
3. Retain the existing Wasender credentials and notification mode. No new OTP or messaging provider is introduced.
4. Ensure each listing has the correct owner/builder contact and each builder has the correct assigned projects.

The migration has not been executed against the live database. Until it is applied, the new actions fail rather than pretend to save enquiries or silently expose a number.

Public API responses and persisted listing caches strip contact fields and brochure links. Previously public brochure files remain accessible to anyone who already knows their external URL; this change does not migrate existing files into private storage.

## Verification

Unit tests cover authentication, consent, forged fields, database failure, duplicate notification suppression, public-field removal, inbox access and visit identity. Browser fixtures cover explicit reveal for signed-in users, anonymous OTP cancellation, and resuming reveal after successful OTP. OTP and messaging calls are intercepted during tests.
