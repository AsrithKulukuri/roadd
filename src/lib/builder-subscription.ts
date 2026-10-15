/**
 * ROADFACING - Builder Subscription & Payment Core Library
 * 
 * Pricing Rule:
 * - 1 Month = 30 days from portal creation / start date
 * - Default Base Price: ₹3,600 per month (multiples of 1, 3, 6, 12 months)
 * - Configurable by Platform Admin
 */

export const BASE_MONTHLY_PRICE = 3600;
export const DAYS_PER_MONTH = 30;

export interface SubscriptionPlan {
  months: number;
  days: number;
  originalPrice: number;
  discountPercent: number;
  finalPrice: number;
  savings: number;
  label: string;
  badge?: string;
  popular?: boolean;
}

export function calculateSubscriptionPlans(basePrice: number = BASE_MONTHLY_PRICE): SubscriptionPlan[] {
  const price = Number(basePrice) > 0 ? Math.round(Number(basePrice)) : BASE_MONTHLY_PRICE;
  return [
    {
      months: 1,
      days: 30,
      originalPrice: price,
      discountPercent: 0,
      finalPrice: price,
      savings: 0,
      label: "1 Month Starter",
      badge: "Base Plan",
    },
    {
      months: 3,
      days: 90,
      originalPrice: price * 3,
      discountPercent: 0,
      finalPrice: price * 3,
      savings: 0,
      label: "3 Months Quarterly",
      badge: "Quarterly Growth",
      popular: true,
    },
    {
      months: 6,
      days: 180,
      originalPrice: price * 6,
      discountPercent: 5,
      finalPrice: Math.round(price * 6 * 0.95),
      savings: Math.round(price * 6 * 0.05),
      label: "6 Months Semi-Annual",
      badge: "Save 5%",
    },
    {
      months: 12,
      days: 360,
      originalPrice: price * 12,
      discountPercent: 10,
      finalPrice: Math.round(price * 12 * 0.90),
      savings: Math.round(price * 12 * 0.10),
      label: "12 Months Annual Enterprise",
      badge: "Save 10% (Best Value)",
    },
  ];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = calculateSubscriptionPlans(BASE_MONTHLY_PRICE);

export type SubscriptionStatus = "active" | "expiring_soon" | "expired" | "pending_payment";

export interface BuilderSubscription {
  status: SubscriptionStatus;
  planMonths: number;
  pricePerMonth: number;
  startDate: string; // ISO
  endDate: string; // ISO
  daysRemaining: number;
  lastPaymentId?: string;
  lastPaymentOrderId?: string;
  lastPaymentAmount?: number;
  lastPaymentDate?: string;
  whatsappRemindedAt?: string;
  invoiceNumber?: string;
}

export interface StoredSubscriptionData {
  subscription?: Partial<BuilderSubscription>;
  credentialsHint?: string;
  password?: string;
}

/**
 * Calculates current status and remaining days
 */
export function calculateSubscriptionDetails(sub?: Partial<BuilderSubscription> | null, createdAt?: string): BuilderSubscription {
  const now = Date.now();
  const baseStart = sub?.startDate || createdAt || new Date().toISOString();
  const planMonths = Number(sub?.planMonths) || 1;
  const pricePerMonth = Number(sub?.pricePerMonth) || BASE_MONTHLY_PRICE;

  // If no endDate provided, calculate from baseStart + (planMonths * 30 days)
  let endDateMs: number;
  if (sub?.endDate) {
    endDateMs = new Date(sub.endDate).getTime();
  } else {
    const startMs = new Date(baseStart).getTime();
    endDateMs = startMs + planMonths * DAYS_PER_MONTH * 24 * 60 * 60 * 1000;
  }

  const msRemaining = endDateMs - now;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  let status: SubscriptionStatus = sub?.status || "active";
  if (status !== "pending_payment") {
    if (msRemaining <= 0) {
      status = "expired";
    } else if (daysRemaining <= 7) {
      status = "expiring_soon";
    } else {
      status = "active";
    }
  }

  return {
    status,
    planMonths,
    pricePerMonth,
    startDate: new Date(baseStart).toISOString(),
    endDate: new Date(endDateMs).toISOString(),
    daysRemaining,
    lastPaymentId: sub?.lastPaymentId,
    lastPaymentOrderId: sub?.lastPaymentOrderId,
    lastPaymentAmount: sub?.lastPaymentAmount,
    lastPaymentDate: sub?.lastPaymentDate,
    whatsappRemindedAt: sub?.whatsappRemindedAt,
    invoiceNumber: sub?.invoiceNumber || `ROAD-SUB-${new Date(baseStart).getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
  };
}

/**
 * Encodes subscription data into the login_credentials_hint field
 * ensuring backward compatibility with plain text passwords.
 */
export function encodeSubscriptionPayload(data: StoredSubscriptionData): string {
  return JSON.stringify({
    __v: 2,
    sub: data.subscription,
    hint: data.credentialsHint,
    pwd: data.password,
  });
}

/**
 * Decodes subscription data from login_credentials_hint
 */
export function decodeSubscriptionPayload(rawText?: string | null): StoredSubscriptionData {
  if (!rawText || !rawText.trim()) return {};
  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === "object" && (parsed.__v === 2 || parsed.sub)) {
      return {
        subscription: parsed.sub,
        credentialsHint: parsed.hint,
        password: parsed.pwd,
      };
    }
  } catch {
    // If not valid JSON, treat as legacy plain text hint
  }
  return { credentialsHint: rawText };
}

/**
 * Generates official Tax Invoice details for a completed payment
 */
export function generateTaxInvoice(builder: {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  officeAddress?: string;
  reraNumber?: string;
}, payment: {
  amount: number;
  paymentId: string;
  orderId?: string;
  planMonths: number;
  date: string;
  invoiceNumber?: string;
}) {
  const invNumber = payment.invoiceNumber || `ROAD-INV-${new Date(payment.date).getFullYear()}-${payment.paymentId.slice(-6).toUpperCase()}`;
  const basePrice = Math.round((payment.amount / 1.18) * 100) / 100;
  const gstAmount = Math.round((payment.amount - basePrice) * 100) / 100;

  return {
    invoiceNumber: invNumber,
    date: payment.date,
    platform: {
      name: "ROAD Platform Private Limited",
      address: "Amaravati Tech Corridor, MG Road, Vijayawada, Andhra Pradesh - 520010",
      gstin: "37AAACR9284Q1Z5",
      pan: "AAACR9284Q",
      sacCode: "998314", // IT & Web Portal Services
      supportEmail: "care@roadfacing.com",
      supportPhone: "+91 88850 05567",
    },
    builder: {
      companyName: builder.companyName,
      contactEmail: builder.contactEmail,
      contactPhone: builder.contactPhone,
      officeAddress: builder.officeAddress || "Registered Builder Office",
      reraNumber: builder.reraNumber || "Applied / Not Disclosed",
    },
    items: [
      {
        description: `ROAD Builder Partner Portal Access Subscription (${payment.planMonths} Month${payment.planMonths > 1 ? "s" : ""} / ${payment.planMonths * DAYS_PER_MONTH} Days)`,
        sac: "998314",
        qty: 1,
        unitPrice: basePrice,
        taxableAmount: basePrice,
        gstRate: "18% (9% CGST + 9% SGST)",
        gstAmount,
        total: payment.amount,
      },
    ],
    summary: {
      subtotal: basePrice,
      cgst: Math.round((gstAmount / 2) * 100) / 100,
      sgst: Math.round((gstAmount / 2) * 100) / 100,
      totalAmount: payment.amount,
      currency: "INR",
      paymentMethod: "Razorpay Secure PG",
      paymentId: payment.paymentId,
      orderId: payment.orderId || "DIRECT_AUTH",
      status: "PAID",
    },
  };
}
