# Builder portal rollout

The portal now uses server-verified sessions and exact project assignments for project edits, reports, requests, messages, schedules and private layout documents. Passwords are verified by Supabase Auth; a profile's optional user_id links that password account. Registered phone numbers use the existing delivered OTP service. No shared password or local-storage authentication fallback remains.

## Database prerequisite

Apply supabase/migrations/20260909_builder_portal_security.sql before deploying the application. Existing installations must already have the builder enterprise tables and project tables. The migration:

- Removes open client permissions on builder records, activity, customer leads and site visits.
- Clears plaintext password hints.
- Creates the private builder-evidence PDF bucket.
- Adds the service-role-only review_builder_request function, which applies approved changes and records the request review in one transaction.

The migration has been authored but has not been executed against the live database. No existing listing was changed or verified during development. Keep a database backup and deploy this migration together with the application because older clients rely on direct table writes.

## Account setup

In Admin → Builders, confirm the registered contact phone and exact project assignments. For password access, link the UUID of an existing Supabase Auth account in the Auth User ID field. Manage passwords through Supabase Auth; do not store passwords in profile fields. Phone OTP remains available without a password account. Legacy builder sessions must sign in again.

## Verification

Builders submit plot evidence from My Projects. PDFs remain in private storage; document links check the signed-in builder/admin before issuing a 60-second download URL. Admin → Builders shows submitted measurements and the private PDF. Approval requires confirmation of the official LP order, survey and boundaries. The application does not fetch or independently verify government records.

## Validation

Unit tests cover authentication bypasses, exact ownership, protected fields, failed saves, sender identity and evidence validation. Browser fixtures exercise OTP requests, failed and successful edits, document form visibility, and request shortcuts without sending messages or modifying live records.
