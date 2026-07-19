"use client";

import { useState, useEffect } from "react";
import { Calculator } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatINR } from "@/lib/utils";

interface MortgageCalculatorProps {
  propertyPrice: number;
}

export function MortgageCalculator({ propertyPrice }: MortgageCalculatorProps) {
  const [downPayment, setDownPayment] = useState(propertyPrice * 0.2);
  const [interestRate, setInterestRate] = useState(8.5);
  const [loanTerm, setLoanTerm] = useState(20);
  const [monthlyEmi, setMonthlyEmi] = useState(0);

  useEffect(() => {
    const principal = propertyPrice - downPayment;
    const ratePerMonth = interestRate / 12 / 100;
    const totalMonths = loanTerm * 12;

    if (principal > 0 && ratePerMonth > 0 && totalMonths > 0) {
      const emi =
        (principal * ratePerMonth * Math.pow(1 + ratePerMonth, totalMonths)) /
        (Math.pow(1 + ratePerMonth, totalMonths) - 1);
      setMonthlyEmi(emi);
    } else {
      setMonthlyEmi(0);
    }
  }, [propertyPrice, downPayment, interestRate, loanTerm]);

  return (
    <div className="bg-bg-card rounded-2xl p-6 border border-border-default shadow-sm mt-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-primary/10 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-amber-primary" />
        </div>
        <h3 className="font-heading text-xl font-bold text-text-primary">
          EMI Calculator
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-text-secondary">Down Payment</span>
              <span className="text-sm font-bold text-text-primary">{formatINR(downPayment)}</span>
            </div>
            <Slider
              value={[downPayment]}
              min={0}
              max={propertyPrice}
              step={100000}
              onValueChange={(val) => setDownPayment(val[0])}
              className="py-2"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-text-secondary">Interest Rate (%)</span>
              <span className="text-sm font-bold text-text-primary">{interestRate.toFixed(1)}%</span>
            </div>
            <Slider
              value={[interestRate]}
              min={5}
              max={15}
              step={0.1}
              onValueChange={(val) => setInterestRate(val[0])}
              className="py-2"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-text-secondary">Loan Term (Years)</span>
              <span className="text-sm font-bold text-text-primary">{loanTerm} Years</span>
            </div>
            <Slider
              value={[loanTerm]}
              min={5}
              max={30}
              step={1}
              onValueChange={(val) => setLoanTerm(val[0])}
              className="py-2"
            />
          </div>
        </div>

        <div className="bg-bg-primary rounded-xl p-6 flex flex-col justify-center items-center text-center border border-border-default/50">
          <p className="text-sm text-text-secondary mb-2">Estimated Monthly EMI</p>
          <p className="text-4xl font-bold text-amber-primary mb-6">
            {formatINR(Math.round(monthlyEmi))}
          </p>
          
          <div className="w-full space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Principal Amount</span>
              <span className="font-medium text-text-primary">{formatINR(propertyPrice - downPayment)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Total Interest</span>
              <span className="font-medium text-text-primary">{formatINR((monthlyEmi * loanTerm * 12) - (propertyPrice - downPayment))}</span>
            </div>
            <div className="w-full h-px bg-border-default my-2" />
            <div className="flex justify-between text-sm font-bold">
              <span className="text-text-primary">Total Amount Payable</span>
              <span className="text-amber-primary">{formatINR(monthlyEmi * loanTerm * 12)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
