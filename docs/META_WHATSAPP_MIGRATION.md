# Meta WhatsApp Cloud API Migration Guide (ROAD)

This document details the transition of the **ROAD** real estate platform from **WaSenderAPI** to the official **Meta WhatsApp Cloud API (Graph API v21.0)**.

---

## 1. Architectural Architecture Overview

The system features a **Dual-Provider Adapter Pattern** centered around `src/lib/wasender.ts` and `src/lib/meta-whatsapp.ts`:

```text
[ Incoming Request (OTP, Visit, Reminder, AI Concierge) ]
                           │
                           ▼
                    WasenderService
                           │
             ┌─────────────┴─────────────┐
             │ WHATSAPP_PROVIDER="meta"   │ WHATSAPP_PROVIDER="wasender"
             ▼                           ▼
    MetaWhatsAppService            WaSender Client
   (Meta Graph API v21.0)        (wasenderapi.com/api)
             │                           │
             ▼                           ▼
[ Official WhatsApp Cloud API ]  [ WaSender Session ]
```

### Key Benefits:
1. **Zero Breaking Changes:** All existing caller files (`/api/auth/send-otp`, `whatsapp-concierge.ts`, `/api/projects/schedule-visit`, `/api/admin/whatsapp/process`, crons) continue calling `WasenderService` seamlessly.
2. **Instant Zero-Downtime Rollback:** If Meta API tokens expire or a template is pending approval, toggle `WHATSAPP_PROVIDER=wasender` in Vercel to instantly route traffic through WaSender without touching code or redeploying.
3. **24-Hour Window Compliance:** AI Concierge and support agent replies are sent within 24 hours of an inbound user message, allowing rich free-form text and images with zero template requirements.

---

## 2. Meta Cloud API Prerequisites & Credentials

In the **Meta Developer Portal** (https://developers.facebook.com/apps):

1. **Create an App**: Select type **Business** ➜ Add product **WhatsApp**.
2. **Phone Number**:
   - In **WhatsApp > API Setup**, identify your **Phone number ID** and **WhatsApp Business Account ID**.
3. **Permanent Access Token**:
   - Do NOT use the temporary 24-hour developer token in production.
   - Go to **Meta Business Manager** (https://business.facebook.com) ➜ **System Users**.
   - Create a System User (Admin role) ➜ Assign the WhatsApp App with `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
   - Click **Generate Token** and select **Never expires**.

---

## 3. Required Message Templates in Meta Business Manager

For business-initiated messages (sent to users who have not messaged within the last 24 hours), submit these templates under **WhatsApp Manager > Message Templates**:

### A. Authentication OTP (`road_auth_otp`)
* **Category:** `AUTHENTICATION`
* **Language:** `English (en)`
* **Body:** `Your ROAD verification code is {{1}}. Valid for 5 minutes. Do not share this OTP with anyone.`
* **Buttons (Optional):** Copy Code (`OTP_CODE`)

### B. Site Visit Confirmed (`road_visit_confirmed`)
* **Category:** `UTILITY`
* **Language:** `English (en)`
* **Body:**
  ```text
  Hello {{1}}! 🏡

  Your site visit for *{{2}}* is CONFIRMED!

  📅 Date: {{3}}
  ⏰ Time Slot: {{4}}
  📍 Location: {{5}}

  Our project team will guide you through the property. Thank you for choosing ROAD Facing!
  ```

### C. Site Visit Reminder (`road_visit_reminder`)
* **Category:** `UTILITY`
* **Language:** `English (en)`
* **Body:**
  ```text
  Upcoming Site Visit Reminder 🔔

  Hi {{1}}, your site visit for *{{2}}* is scheduled today at {{3}}.
  📍 Location: {{4}}

  Reply to this message if you need directions or wish to reschedule.
  ```

---

## 4. Production Vercel Environment Variables

Set the following variables in **Vercel Project Settings > Environment Variables**:

```env
# Provider Switch
WHATSAPP_PROVIDER=meta

# Meta Credentials
META_WHATSAPP_PHONE_NUMBER_ID=104928509384729
META_WHATSAPP_ACCESS_TOKEN=EAAxxxx...
META_WHATSAPP_BUSINESS_ACCOUNT_ID=293847501928374
META_WHATSAPP_API_VERSION=v21.0

# Webhook Handshake & Security
META_WEBHOOK_VERIFY_TOKEN=134591ce0905783a29026d3bdda84c8ef445bef6e54617e9054a2eb3b7438f9a
# META_APP_SECRET=your-meta-app-secret

# Operational Mode
WASENDER_OTP_MODE=live
WASENDER_NOTIFICATION_MODE=live

# Template Names (Optional - defaults to standard names)
META_OTP_TEMPLATE_NAME=road_auth_otp
# META_OTP_HAS_BUTTON=true
```

---

## 5. Webhook Setup in Meta App Dashboard

1. Go to **WhatsApp > Configuration > Callback URL > Edit**:
   - **Callback URL:**
     ```text
     https://roadd-three.vercel.app/api/webhooks/meta-whatsapp
     ```
   - **Verify Token:**
     ```text
     134591ce0905783a29026d3bdda84c8ef445bef6e54617e9054a2eb3b7438f9a
     ```
2. Click **Verify and Save**.
3. Under **Webhook fields**, click **Manage** and subscribe to **`messages`**.

---

## 6. Verification and Testing

### 1. Verification Handshake (GET)
```bash
curl -i "https://roadd-three.vercel.app/api/webhooks/meta-whatsapp?hub.mode=subscribe&hub.challenge=1158201444&hub.verify_token=134591ce0905783a29026d3bdda84c8ef445bef6e54617e9054a2eb3b7438f9a"
```
*Expected: HTTP 200 with body `1158201444`.*

### 2. Inbound Message Simulation (POST)
```bash
curl -i -X POST "https://roadd-three.vercel.app/api/webhooks/meta-whatsapp" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [{
        "field": "messages",
        "value": {
          "messaging_product": "whatsapp",
          "metadata": { "display_phone_number": "15550234567", "phone_number_id": "123456" },
          "contacts": [{ "profile": { "name": "Buyer" }, "wa_id": "918885005567" }],
          "messages": [{ "from": "918885005567", "id": "wamid.test_001", "timestamp": "1726660000", "type": "text", "text": { "body": "3bhk in Poranki" } }]
        }
      }]
    }]
  }'
```
*Expected: HTTP 200 with body `EVENT_RECEIVED`.*
