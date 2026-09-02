# WhatsApp Broadcast Deployment

## 1. Apply database migrations

Apply these SQL files to the production Supabase project in this order:

1. `supabase/migrations/20260901_harden_phone_otp_rate_limits.sql`
2. `supabase/migrations/20260901_whatsapp_broadcasts.sql`

The first migration preserves OTP request history, adds network rate-limit data,
enforces one active OTP per phone, and installs the atomic failed-attempt RPC.
The second creates the consent ledger, campaigns, recipients, and atomic queue
claiming function.

## 2. Configure production secrets

Set these in the deployment environment. Never expose them with a
`NEXT_PUBLIC_` prefix.

```text
SESSION_SECRET=<at least 32 random characters>
RATE_LIMIT_HASH_SECRET=<at least 32 random characters>
OTP_HASH_SECRET=<at least 32 random characters>
WASENDER_API_KEY=<Wasender bearer token>
WASENDER_BASE_URL=https://www.wasenderapi.com/api
WASENDER_OTP_MODE=live
WASENDER_NOTIFICATION_MODE=live
WASENDER_BROADCAST_INTERVAL_MS=60000
WASENDER_WEBHOOK_SECRET=<secret copied from the Wasender session>
```

`WASENDER_BROADCAST_INTERVAL_MS=60000` respects the Wasender trial limit of one
send request per minute. Only reduce it for a paid account and never below
`5000` when Account Protection is enabled.

Also confirm the existing Supabase service-role variables and
`NEXT_PUBLIC_APP_URL` point to production.

## 3. Configure the Wasender webhook

In the Wasender session settings, set the public HTTPS webhook URL to:

```text
https://YOUR-DOMAIN/api/webhooks/wasender
```

Use the same secret configured in `WASENDER_WEBHOOK_SECRET` and enable the
`messages.received` event. The endpoint recognizes STOP, UNSUBSCRIBE, CANCEL,
END, and QUIT, then immediately suppresses queued messages for that contact.

## 4. Go-live checks

1. Keep both Wasender modes on `mock` while testing the admin UI.
2. Add one consented test number and send one text-only campaign.
3. Send one JPEG or PNG campaign using a public HTTPS URL no larger than 5 MB.
4. Reply `STOP` and confirm the contact becomes ineligible in
   `/admin/broadcasts`.
5. Switch to `live` only after the single-recipient checks pass.

The admin must keep the broadcast page open while its paced queue is running.
If the browser closes, open campaign history and select Resume. Atomic claiming
prevents duplicate delivery, and abandoned claims become retryable after ten
minutes.

Official references:

- https://app.wasenderapi.com/api-docs/messages/send-image-message
- https://app.wasenderapi.com/api-docs/rate-limits/understanding-rate-limits
- https://wasenderapi.com/api-docs/webhooks/webhook-setup
