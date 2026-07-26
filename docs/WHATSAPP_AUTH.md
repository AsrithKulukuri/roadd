# WhatsApp OTP Authentication System Documentation (ROAD)

Production-ready WhatsApp OTP Authentication System built with Next.js 15 (App Router), Supabase, WasenderAPI, Axios, TypeScript, and Tailwind CSS.

---

## 📁 Folder Structure

```text
road/
├── .env.example                            # Required environment variables template
├── docs/
│   └── WHATSAPP_AUTH.md                    # Complete System Documentation & Postman Collection
├── supabase/
│   └── migrations/
│       └── create_phone_otps_table.sql      # Database migration & RLS policies
└── src/
    ├── app/
    │   └── api/
    │       └── auth/
    │           ├── send-otp/
    │           │   └── route.ts            # POST /api/auth/send-otp (Generates & sends WhatsApp OTP)
    │           └── verify-otp/
    │               └── route.ts            # POST /api/auth/verify-otp (Verifies OTP & creates session)
    ├── components/
    │   └── auth/
    │       ├── phone-input.tsx             # Indian mobile number input (+91)
    │       ├── otp-input.tsx               # 6-digit PIN input with paste & auto-focus
    │       └── whatsapp-auth-modal.tsx     # Dark luxury WhatsApp OTP auth modal
    ├── hooks/
    │   └── useWhatsAppAuth.ts              # Custom React hook for state management & API calls
    ├── lib/
    │   ├── logger.ts                       # Server audit logger
    │   ├── otp.ts                          # Crypto OTP generator & SHA-256 constant-time verifier
    │   ├── rate-limiter.ts                 # 60s cooldown & 5 req/hr rate limiter
    │   ├── supabase-admin.ts               # Server-only Supabase Service Role client
    │   ├── wasender.ts                     # WasenderAPI service using Axios
    │   └── validations/
    │       └── auth.ts                     # Zod input schemas for Indian phone numbers & OTPs
    └── types/
        └── auth.ts                         # TypeScript interfaces for request/response payloads
```

---

## 🗄️ SQL Migration (Supabase)

Run the following SQL in your Supabase SQL Editor:

```sql
-- 1. Create phone_otps table
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON public.phone_otps(phone);
CREATE INDEX IF NOT EXISTS idx_phone_otps_expires_at ON public.phone_otps(expires_at);

-- 3. Row Level Security
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access to phone_otps" ON public.phone_otps FOR ALL USING (false);
```

---

## ⚙️ Environment Variables

Add to `.env.local` for local development and Vercel Environment Variables for production:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
WASENDER_API_KEY=your-wasender-bearer-token
WASENDER_BASE_URL=https://wasenderapi.com/api
```

---

## 📡 API Specs & cURL / Axios Examples

### 1. Send OTP (`POST /api/auth/send-otp`)

#### Request Body
```json
{
  "phone": "+919876543210"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "OTP sent successfully to your WhatsApp number.",
  "expiresInSeconds": 300
}
```

#### cURL Example
```bash
curl -X POST "http://localhost:3000/api/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

#### Axios Example
```typescript
import axios from "axios";

const res = await axios.post("/api/auth/send-otp", {
  phone: "+919876543210"
});
console.log(res.data);
```

---

### 2. Verify OTP (`POST /api/auth/verify-otp`)

#### Request Body
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "WhatsApp OTP verified successfully. Authenticated into ROAD.",
  "user": {
    "id": "usr_123456",
    "phone": "+919876543210",
    "role": "buyer"
  }
}
```

#### cURL Example
```bash
curl -X POST "http://localhost:3000/api/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "123456"}'
```

---

## 📬 Postman Collection JSON

Save this JSON block as `ROAD_WhatsApp_Auth.postman_collection.json` and import into Postman:

```json
{
  "info": {
    "name": "ROAD WhatsApp Auth API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Send WhatsApp OTP",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"phone\": \"+919876543210\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/api/auth/send-otp",
          "host": ["{{baseUrl}}"],
          "path": ["api", "auth", "send-otp"]
        }
      }
    },
    {
      "name": "Verify WhatsApp OTP",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"phone\": \"+919876543210\",\n  \"otp\": \"123456\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/api/auth/verify-otp",
          "host": ["{{baseUrl}}"],
          "path": ["api", "auth", "verify-otp"]
        }
      }
    }
  ]
}
```

---

## 🚀 Vercel Production Deployment Steps

1. **Push Changes to GitHub**:
   `git add . && git commit -m "feat(auth): complete production-ready WhatsApp OTP system" && git push origin main`

2. **Configure Environment Variables in Vercel Dashboard**:
   Go to **Project Settings > Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `WASENDER_API_KEY`
   - `WASENDER_BASE_URL`

3. **Deploy**:
   Vercel automatically builds and deploys your application!
