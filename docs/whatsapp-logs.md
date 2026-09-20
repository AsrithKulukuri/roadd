# WhatsApp Logs

Open `/admin/whatsapp-logs` from the admin sidebar. The page refreshes every 15 seconds and supports phone, recipient type, status and date filters. Dates and times use Asia/Kolkata (IST).

## Activation

1. Apply `supabase/migrations/20260920_whatsapp_message_logs.sql` in the project's Supabase SQL editor before deploying the application. Only the service role can access the tables and functions; the API requires an authenticated admin.
2. For Meta, configure `https://<your-domain>/api/webhooks/meta-whatsapp` with the `messages` subscription and set `META_APP_SECRET` (or `META_WHATSAPP_APP_SECRET`) to the Meta app secret. The verification token is separate and cannot replace this secret. Unsigned or unconfigured webhook requests are rejected.
3. Deploy the application. Check a new, authorized message through its status history. No real messages are sent by the automated logging tests.

## Status meanings

- Queued: an application dispatch has started; no completed provider response has been recorded.
- Accepted: the provider accepted the send request. This does not establish delivery.
- Sent, delivered, read: reported by an authenticated provider webhook.
- Failed: the send failed or a delivery failure was reported. The error and failure time are retained.
- Simulated: a mock send; no delivery is claimed.

The database keeps receipts that arrive before the send result, deduplicates retries, and prevents an older sent receipt from overwriting a read status. Missing timestamps remain blank rather than being inferred. A read receipt may be unavailable when the recipient disables read receipts.

All application send methods, OTPs, support replies, broadcasts, listing leads, visit notifications and admin property shares are logged. OTP bodies are redacted. Retries invoked by the application create separate records; low-level HTTP retries inside one send are represented by their final dispatch result. All sends use Meta WhatsApp Cloud API. Template logs retain supplied template parameters or source notification text, not the provider's rendered template.

History begins after activation. Manual `wa.me` shares and messages sent independently in WhatsApp are not observable by the application. Existing messages cannot be assigned historical delivered/read times without provider receipts. A database logging failure is reported in server diagnostics and never causes an already sent message to be resent.



Site visit confirmations and reminders use `META_SITE_VISIT_TEMPLATE_NAME` (default `road_alert_notification`) with one body text parameter. Set `META_NOTIFICATION_MODE=live` and configure the app secret and messages webhook subscription in the deployed environment. Accepted messages are not guaranteed delivered.
