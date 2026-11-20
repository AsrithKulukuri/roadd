import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Load .env.local if present
try {
  if (fs.existsSync(".env.local")) {
    const envContent = fs.readFileSync(".env.local", "utf8");
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([\w.-]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
} catch {}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_role_key_for_unit_tests";
}

import {
  isSiteVisitIntent,
  extractVisitTimeSlot,
  handleSiteVisitBooking,
} from "../../src/lib/whatsapp/site-visit-engine";
import {
  calculateHomeLoanEmi,
  calculateApStampDuty,
  parseFinancialQuery,
} from "../../src/lib/whatsapp/financial-calculators";
import { processInboundWhatsAppMessage } from "../../src/lib/whatsapp/whatsapp-concierge";

test("Phase 3.1: Site visit intent detection and time-slot parsing", () => {
  assert.equal(isSiteVisitIntent("book site visit"), true);
  assert.equal(isSiteVisitIntent("I want to visit the site tomorrow at 4pm"), true);
  assert.equal(isSiteVisitIntent("schedule a visit for Avenue Serene"), true);
  assert.equal(isSiteVisitIntent("what is the price of 3bhk in poranki"), false);

  const slot1 = extractVisitTimeSlot("visit tomorrow morning");
  assert.equal(slot1.dateStr, "Tomorrow");
  assert.equal(slot1.timeStr, "10:30 AM");

  const slot2 = extractVisitTimeSlot("this saturday at 4pm");
  assert.equal(slot2.dateStr, "This Saturday");
  assert.equal(slot2.timeStr, "04:00 PM");
});

test("Phase 3.2: Site visit booking generates rich confirmation card & CRM lead sync", async () => {
  const phone = `+91966${Math.floor(1000000 + Math.random() * 9000000)}`;

  const booking = await handleSiteVisitBooking({
    phone,
    userName: "Suresh",
    text: "book site visit tomorrow at 11am",
    lastViewedRefId: "REF0001",
  });

  assert.equal(booking.isBooking, true);
  assert.equal(booking.scheduled, true);
  assert.ok(booking.confirmationMessage.includes("Site Visit Confirmed"));
  assert.ok(booking.confirmationMessage.includes("REF0001"));
  assert.ok(booking.confirmationMessage.includes("Tomorrow"));
  assert.ok(booking.confirmationMessage.includes("11:00 AM"));
  assert.ok(!booking.confirmationMessage.includes("localhost"));
});

test("Phase 3.3: Home loan EMI calculator accurately computes monthly installment & interest", () => {
  // Principal: 80L, 8.5% p.a., 20 years
  const res = calculateHomeLoanEmi(8000000, 8.5, 20);

  // Exact standard compound formula value: ~69,426
  assert.ok(res.monthlyEmi >= 69400 && res.monthlyEmi <= 69500, `EMI calculated was ${res.monthlyEmi}`);
  assert.equal(res.principal, 8000000);
  assert.equal(res.annualInterestRate, 8.5);
  assert.equal(res.tenureYears, 20);
  assert.ok(res.totalInterest > 8000000, "20-year interest exceeds principal at 8.5%");
  assert.equal(res.totalPayment, res.principal + res.totalInterest);
  assert.ok(res.formattedMessage.includes("ROAD Home Loan EMI Estimate"));
  assert.ok(res.formattedMessage.includes("₹80,00,000"));
});

test("Phase 3.4: AP Stamp duty estimator calculates exact 7.5% breakdown", () => {
  // Property value: 80 Lakhs
  const res = calculateApStampDuty(8000000);

  assert.equal(res.propertyValue, 8000000);
  assert.equal(res.stampDuty, 400000); // 5.0%
  assert.equal(res.transferDuty, 120000); // 1.5%
  assert.equal(res.registrationFee, 80000); // 1.0%
  assert.equal(res.totalGovernmentCharges, 600000); // 7.5%
  assert.ok(res.formattedMessage.includes("Andhra Pradesh Stamp Duty"));
  assert.ok(res.formattedMessage.includes("₹6,00,000"));
});

test("Phase 3.5: Financial calculation query parser recognizes user inquiries", () => {
  const q1 = parseFinancialQuery("calculate emi for 80 lakhs at 8.5% for 20 years");
  assert.equal(q1.type, "emi");
  assert.equal(q1.principal, 8000000);
  assert.equal(q1.rate, 8.5);
  assert.equal(q1.years, 20);

  const q2 = parseFinancialQuery("what are stamp duty and registration charges for 1 cr flat in vijayawada");
  assert.equal(q2.type, "stamp_duty");
  assert.equal(q2.principal, 10000000);

  const q3 = parseFinancialQuery("flats in guntur under 70 lakhs");
  assert.equal(q3.type, "none");
});

test("Phase 3.6: End-to-end WhatsApp turn: EMI calculation and Site visit request", async () => {
  const phone = `+91955${Math.floor(1000000 + Math.random() * 9000000)}`;

  // 1. EMI Calculation in chat
  const r1 = await processInboundWhatsAppMessage(phone, "calculate EMI for 60 lakhs");
  assert.equal(r1.intent, "emi_calculation");
  assert.ok(r1.message?.includes("Monthly EMI"));
  assert.ok(!r1.message?.includes("localhost"));

  // 2. Stamp Duty in chat
  const r2 = await processInboundWhatsAppMessage(phone, "what is stamp duty for 60 lakhs in AP");
  assert.equal(r2.intent, "stamp_duty_estimate");
  assert.ok(r2.message?.includes("Stamp Duty (5.0%)"));
  assert.ok(r2.message?.includes("Total Government Charges (7.5%)"));

  // 3. Site visit booking in chat
  const r3 = await processInboundWhatsAppMessage(phone, "book site visit tomorrow at 4pm");
  assert.equal(r3.intent, "site_visit_booking");
  assert.ok(r3.message?.includes("Site Visit Confirmed"));
  assert.ok(r3.message?.includes("Tomorrow"));
});

