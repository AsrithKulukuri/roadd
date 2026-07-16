"use client";

import { useState, useEffect, useMemo } from "react";
import { Calculator, IndianRupee, PieChart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { calculateEMI } from "@/lib/utils";

export default function MortgageCalculatorPage() {
  const [propertyPrice, setPropertyPrice] = useState<number>(10000000); // 1 Cr
  const [downPayment, setDownPayment] = useState<number>(2000000); // 20%
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [tenureYears, setTenureYears] = useState<number>(20);

  const loanAmount = propertyPrice - downPayment;
  
  const { emi, totalInterest, totalPayment } = useMemo(() => {
    const emiAmount = calculateEMI(loanAmount, interestRate, tenureYears);
    const totalPaymentAmount = emiAmount * tenureYears * 12;
    const totalInterestAmount = totalPaymentAmount - loanAmount;
    
    return {
      emi: emiAmount,
      totalPayment: totalPaymentAmount,
      totalInterest: totalInterestAmount
    };
  }, [loanAmount, interestRate, tenureYears]);

  const handlePriceChange = (val: string) => {
    const num = Number(val.replace(/[^0-9]/g, ""));
    setPropertyPrice(num);
    // Auto-adjust down payment to 20%
    setDownPayment(Math.round(num * 0.2));
  };

  return (
    <div className="flex flex-col min-h-screen pt-24 pb-16">
      <section className="py-12 bg-bg-card border-b border-border-default/50">
        <div className="container-road">
          <div className="max-w-3xl text-center mx-auto space-y-4">
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-text-primary">
              Home Loan EMI Calculator
            </h1>
            <p className="text-lg text-text-secondary">
              Plan your property purchase with our advanced EMI calculator tailored for Indian home loans.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-road max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Input Controls */}
            <div className="lg:col-span-7 space-y-8 bg-bg-card border border-border-default rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border-default">
                <Calculator className="h-6 w-6 text-amber-primary" />
                <h2 className="font-heading text-2xl font-bold text-text-primary">Loan Details</h2>
              </div>

              {/* Property Price */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-medium text-text-secondary">Property Price</label>
                  <div className="relative w-40">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                    <Input 
                      type="text" 
                      value={propertyPrice}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      className="pl-9 font-semibold"
                    />
                  </div>
                </div>
                <input 
                  type="range" 
                  min="1000000" 
                  max="100000000" 
                  step="100000"
                  value={propertyPrice}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="w-full accent-amber-primary"
                />
                <div className="flex justify-between text-xs text-text-tertiary">
                  <span>₹10L</span>
                  <span>₹10Cr</span>
                </div>
              </div>

              {/* Down Payment */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-medium text-text-secondary">Down Payment</label>
                  <div className="relative w-40">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                    <Input 
                      type="text" 
                      value={downPayment}
                      onChange={(e) => setDownPayment(Number(e.target.value.replace(/[^0-9]/g, "")))}
                      className="pl-9 font-semibold"
                    />
                  </div>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max={propertyPrice} 
                  step="100000"
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="w-full accent-amber-primary"
                />
                <div className="text-xs text-text-tertiary text-right">
                  {((downPayment / propertyPrice) * 100).toFixed(1)}% of Property Price
                </div>
              </div>

              {/* Interest Rate & Tenure */}
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-medium text-text-secondary">Interest Rate (p.a.)</label>
                    <div className="relative w-24">
                      <Input 
                        type="number" 
                        value={interestRate}
                        onChange={(e) => setInterestRate(Number(e.target.value))}
                        className="pr-8 font-semibold text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">%</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="15" 
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full accent-amber-primary"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-medium text-text-secondary">Loan Tenure</label>
                    <div className="relative w-24">
                      <Input 
                        type="number" 
                        value={tenureYears}
                        onChange={(e) => setTenureYears(Number(e.target.value))}
                        className="pr-12 font-semibold text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">Yrs</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="30" 
                    step="1"
                    value={tenureYears}
                    onChange={(e) => setTenureYears(Number(e.target.value))}
                    className="w-full accent-amber-primary"
                  />
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-5">
              <div className="sticky top-28 bg-amber-primary/5 border border-amber-primary/20 rounded-3xl p-6 md:p-8 text-center shadow-amber-subtle">
                <h3 className="font-heading text-lg font-bold text-text-primary mb-2">Equated Monthly Installment</h3>
                <div className="text-5xl font-bold text-amber-primary font-heading tracking-tight mb-8">
                  {formatINR(emi)}
                </div>

                <div className="space-y-4 text-left">
                  <div className="flex justify-between pb-4 border-b border-border-default/50">
                    <span className="text-text-secondary">Principal Amount</span>
                    <span className="font-semibold text-text-primary">{formatINR(loanAmount)}</span>
                  </div>
                  <div className="flex justify-between pb-4 border-b border-border-default/50">
                    <span className="text-text-secondary">Total Interest Payable</span>
                    <span className="font-semibold text-text-primary">{formatINR(totalInterest)}</span>
                  </div>
                  <div className="flex justify-between pb-4 border-b border-border-default/50">
                    <span className="text-text-secondary font-bold">Total Payment</span>
                    <span className="font-bold text-text-primary">{formatINR(totalPayment)}</span>
                  </div>
                </div>

                <Button variant="amber" size="xl" className="w-full mt-8 rounded-xl">
                  Apply for Pre-approval
                </Button>
                <p className="text-xs text-text-tertiary mt-4">
                  * EMI shown is indicative. Actual interest rates may vary based on bank policies and credit score.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
