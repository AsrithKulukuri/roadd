import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home Loan EMI Calculator",
  description:
    "Calculate your monthly home loan EMI, total interest, and amortisation schedule for properties in Vijayawada, Guntur, and Amaravati.",
};

export default function MortgageCalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
