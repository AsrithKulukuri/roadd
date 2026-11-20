import { formatPriceCompact } from "@/lib/utils";

export interface EmiCalculationResult {
  principal: number;
  annualInterestRate: number;
  tenureYears: number;
  monthlyEmi: number;
  totalInterest: number;
  totalPayment: number;
  formattedMessage: string;
}

export interface StampDutyResult {
  propertyValue: number;
  stampDuty: number; // 5%
  transferDuty: number; // 1.5%
  registrationFee: number; // 1%
  totalGovernmentCharges: number; // 7.5%
  formattedMessage: string;
}

/**
 * Standard Home Loan EMI Calculator using standard compound reducing balance formula:
 * E = P * r * (1 + r)^n / ((1 + r)^n - 1)
 */
export function calculateHomeLoanEmi(
  principal: number,
  annualInterestRate = 8.5,
  tenureYears = 20
): EmiCalculationResult {
  const p = Math.max(100000, principal);
  const annualRate = annualInterestRate > 0 ? annualInterestRate : 8.5;
  const tenure = tenureYears > 0 ? tenureYears : 20;

  const monthlyRate = annualRate / 12 / 100;
  const totalMonths = tenure * 12;

  const emi = Math.round(
    (p * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1)
  );

  const totalPayment = emi * totalMonths;
  const totalInterest = totalPayment - p;

  const formattedMessage =
    `📊 *ROAD Home Loan EMI Estimate*\n\n` +
    `💰 *Loan Principal:* ₹${p.toLocaleString("en-IN")}\n` +
    `📈 *Interest Rate:* ${annualRate}% p.a.\n` +
    `⏳ *Loan Tenure:* ${tenure} Years (${totalMonths} months)\n\n` +
    `💳 *Estimated Monthly EMI:* *₹${emi.toLocaleString("en-IN")}/month*\n` +
    `💵 *Total Interest Payable:* ₹${totalInterest.toLocaleString("en-IN")}\n` +
    `🏦 *Total Repayment Amount:* ₹${totalPayment.toLocaleString("en-IN")}\n\n` +
    `_Note: Exact interest rates depend on applicant credit score and lending bank (HDFC, SBI, ICICI, etc.). Reply "Talk to loan advisor" for instant pre-approval!_`;

  return {
    principal: p,
    annualInterestRate: annualRate,
    tenureYears: tenure,
    monthlyEmi: emi,
    totalInterest,
    totalPayment,
    formattedMessage,
  };
}

/**
 * Andhra Pradesh Government Stamp Duty & Registration Fee Estimator (7.5% Total)
 * Standard AP Structure:
 * - 5.0% Stamp Duty
 * - 1.5% Transfer Duty / Municipal Surcharge (varies by jurisdiction: Municipal Corporation, Municipality, or Gram Panchayat)
 * - 1.0% Registration Fee
 *
 * Statutory Rule: Duty is levied on the HIGHER of sale agreement consideration or IGRS market value (guidance value).
 */
export function calculateApStampDuty(propertyValue: number, marketValue?: number): StampDutyResult {
  const saleVal = Math.max(100000, propertyValue);
  const effectiveVal = marketValue && marketValue > saleVal ? marketValue : saleVal;

  const stampDuty = Math.round(effectiveVal * 0.05); // 5.0%
  const transferDuty = Math.round(effectiveVal * 0.015); // 1.5% (jurisdiction variable)
  const registrationFee = Math.round(effectiveVal * 0.01); // 1.0%
  const totalGovernmentCharges = stampDuty + transferDuty + registrationFee; // ~7.5%

  const formattedMessage =
    `🏛️ *Andhra Pradesh Stamp Duty & Registration Fee Estimate*\n\n` +
    `🏠 *Declared Consideration Value:* ₹${saleVal.toLocaleString("en-IN")}\n` +
    (marketValue && marketValue > saleVal
      ? `📈 *Higher IGRS Market Value Applied:* ₹${marketValue.toLocaleString("en-IN")}\n\n`
      : `\n`) +
    `⚖️ *Statutory Rule:* Government stamp duty in Andhra Pradesh is levied on whichever is **HIGHER**: the actual sale agreement consideration or the government IGRS market value (guidance value).\n\n` +
    `📋 *Indicative Fee Breakdown (AP Registration Dept):*\n` +
    `• *Basic Stamp Duty (5.0%):* ₹${stampDuty.toLocaleString("en-IN")}\n` +
    `• *Transfer Duty / Local Surcharge (1.5%):* ₹${transferDuty.toLocaleString("en-IN")} *(Note: Transfer duty varies by local jurisdiction — Municipal Corporation vs Municipality vs Gram Panchayat)*\n` +
    `• *Registration Fee (1.0%):* ₹${registrationFee.toLocaleString("en-IN")}\n\n` +
    `💰 *Total Government Charges (7.5%):* *₹${totalGovernmentCharges.toLocaleString("en-IN")}*\n\n` +
    `❓ *Do you know the exact IGRS registration/guidance value for this survey number?* If yes, reply with the registration value for an exact re-calculation.\n\n` +
    `⚠️ _Please confirm on the official IGRS AP duty calculator (https://registration.ap.gov.in) before final deed execution._`;

  return {
    propertyValue: effectiveVal,
    stampDuty,
    transferDuty,
    registrationFee,
    totalGovernmentCharges,
    formattedMessage,
  };
}

/**
 * Extracts numeric amounts from queries like:
 * - "calculate EMI for 50 lakhs"
 * - "stamp duty on 75L"
 * - "EMI for 1.2 crore at 8.5% for 15 years"
 */
export function parseFinancialQuery(text: string): {
  type: "emi" | "stamp_duty" | "none";
  principal?: number;
  amount?: number;
  rate?: number;
  interestRate?: number;
  years?: number;
  tenureYears?: number;
} {
  const norm = text.toLowerCase();

  // Exclude property search queries with EMI adjectives (e.g. "flats under 60 lakhs emi friendly")
  const hasListingKeywords = /\b(?:flats?|apartments?|villas?|plots?|houses?|bhk|projects?)\b/i.test(norm);
  const isExplicitEmiCalc = /\b(?:calculate\s+emi|what\s+is\s+(?:the\s+)?emi|monthly\s+emi|emi\s+for|emi\s+on|loan\s+emi|emi\s+calculator)\b/i.test(norm);

  const isEmi = isExplicitEmiCalc || (/\b(?:emi|monthly installment|loan calculation|loan calculator)\b/i.test(norm) && !hasListingKeywords);
  const isStamp = /\b(?:stamp duty|registration fee|registration charges|government fees?|patta registration)\b/i.test(norm);

  if (!isEmi && !isStamp) {
    return { type: "none" };
  }

  // Extract amount
  let amount: number | undefined;
  const crMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)\b/);
  const lakhMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:l|lac|lakh|lakhs)\b/);
  const rawNumMatch = norm.match(/(?:for|on|of|amount|value)?\s*(?:rs\.?|inr|₹)?\s*(\d{5,10})\b/);

  if (crMatch) {
    amount = Math.round(parseFloat(crMatch[1]) * 10000000);
  } else if (lakhMatch) {
    amount = Math.round(parseFloat(lakhMatch[1]) * 100000);
  } else if (rawNumMatch) {
    amount = parseInt(rawNumMatch[1], 10);
  }

  // Extract tenure if present
  let tenureYears = 20;
  const tenureMatch = norm.match(/(\d{1,2})\s*(?:year|years|yrs)\b/);
  if (tenureMatch) {
    tenureYears = parseInt(tenureMatch[1], 10);
  }

  // Extract interest rate if present
  let interestRate = 8.5;
  const rateMatch = norm.match(/(\d+(?:\.\d+)?)\s*%/);
  if (rateMatch) {
    interestRate = parseFloat(rateMatch[1]);
  }

  return {
    type: isEmi ? "emi" : "stamp_duty",
    principal: amount,
    amount,
    rate: interestRate,
    interestRate,
    years: tenureYears,
    tenureYears,
  };
}
