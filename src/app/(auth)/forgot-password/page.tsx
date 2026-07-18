"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shared/logo";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  Mail,
  Phone,
  Lock,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Check,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

const countryCodes = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "USA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Method/Input, 2: OTP, 3: New Pass, 4: Success
  const [resetMethod, setResetMethod] = useState<"phone" | "email">("phone");
  const [isLoading, setIsLoading] = useState(false);

  // Form Fields
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  
  // OTP code
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const mockOtp = "842910";

  // Password reset fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Validation
  const [inputError, setInputError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".country-selector")) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError("");

    let destination = "";
    if (resetMethod === "phone") {
      const rawPhone = phoneNumber.replace(/\D/g, "");
      if (!rawPhone) {
        setInputError("Phone number is required");
        return;
      }
      if (selectedCountry.code === "+91" && rawPhone.length !== 10) {
        setInputError("Please enter a valid 10-digit number");
        return;
      }
      destination = `${selectedCountry.code}${rawPhone}`;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailAddress.trim()) {
        setInputError("Email address is required");
        return;
      }
      if (!emailRegex.test(emailAddress)) {
        setInputError("Please enter a valid email address");
        return;
      }
      destination = emailAddress.trim();
    }

    setIsLoading(true);

    if (isSupabaseConfigured()) {
      try {
        // Send OTP using Supabase Auth (signInWithOtp acts as security code sender)
        const { error } = await supabase.auth.signInWithOtp(
          resetMethod === "phone"
            ? { phone: destination }
            : { email: destination }
        );

        if (error) throw error;

        setIsLoading(false);
        setStep(2);
        toast.success(`Verification OTP sent successfully!`);
      } catch (err: any) {
        console.error("Supabase OTP send error:", err);
        setInputError(err.message || "Failed to send verification code. Ensure Auth OTP is enabled in Supabase.");
        setIsLoading(false);
      }
    } else {
      // FALLBACK: Mock sending OTP
      setTimeout(() => {
        setIsLoading(false);
        setStep(2);
        
        const displayDest = resetMethod === "phone" 
          ? `${selectedCountry.code} ${phoneNumber}` 
          : emailAddress;
        
        toast.success(`Verification code sent to ${displayDest}! (Mock Mode)`);
        
        setTimeout(() => {
          toast.info(`DEMO OPTION: Enter verification code "${mockOtp}" to proceed.`, {
            duration: 8000,
          });
        }, 800);
      }, 1200);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.charAt(value.length - 1);
    }
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError("");

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasteData.length === 6) {
      const newOtp = pasteData.split("");
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otp.join("");
    
    if (enteredCode.length !== 6) {
      setOtpError("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);

    if (isSupabaseConfigured()) {
      try {
        const destination = resetMethod === "phone"
          ? `${selectedCountry.code}${phoneNumber.replace(/\D/g, "")}`
          : emailAddress.trim();

        // Verify OTP code on Supabase
        const verifyParams = resetMethod === "phone"
          ? { phone: destination, token: enteredCode, type: "sms" as const }
          : { email: destination, token: enteredCode, type: "email" as const };

        const { data, error } = await supabase.auth.verifyOtp(verifyParams);

        if (error) throw error;

        if (data.session) {
          setIsLoading(false);
          setStep(3);
          toast.success("Identity verified successfully!");
        } else {
          throw new Error("Could not authenticate session. Try again.");
        }
      } catch (err: any) {
        console.error("Supabase verify OTP error:", err);
        setOtpError(err.message || "Invalid OTP code.");
        setIsLoading(false);
      }
    } else {
      // FALLBACK: Mock verification code
      setTimeout(() => {
        setIsLoading(false);
        if (enteredCode === mockOtp) {
          setStep(3);
          toast.success("Identity verified successfully! (Mock Mode)");
        } else {
          setOtpError("Invalid code. Please try again (Demo Code: 842910)");
        }
      }, 1000);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    if (isSupabaseConfigured()) {
      try {
        // Update password for current authenticated user session
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) throw error;

        setIsLoading(false);
        setStep(4);
        toast.success("Password reset successfully!");
        
        // Log out immediately to clear recovery session
        await supabase.auth.signOut();
        localStorage.removeItem("road_user");
      } catch (err: any) {
        console.error("Supabase password update error:", err);
        setPasswordError(err.message || "Failed to update password.");
        setIsLoading(false);
      }
    } else {
      // FALLBACK: Mock password reset
      setTimeout(() => {
        setIsLoading(false);
        setStep(4);
        toast.success("Password reset successfully! (Mock Mode)");
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4 pt-28 pb-12 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-amber-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass border border-glass-border rounded-3xl p-8 shadow-elevated relative z-10 overflow-hidden"
      >
        <div className="flex justify-center gap-1.5 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === s ? "w-6 bg-amber-primary" : s < step ? "w-2 bg-success" : "w-2 bg-border-default"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="font-heading text-2xl font-bold text-text-primary tracking-tight">
                  Reset Password
                </h1>
                <p className="text-text-secondary text-sm mt-1">
                  Choose a method to receive your verification code
                </p>
              </div>

              <div className="grid grid-cols-2 p-1.5 bg-bg-primary/60 border border-border-default/60 rounded-2xl">
                <button
                  type="button"
                  onClick={() => { setResetMethod("phone"); setInputError(""); }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all ${
                    resetMethod === "phone"
                      ? "bg-amber-primary text-bg-primary shadow-amber-subtle"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  Phone SMS
                </button>
                <button
                  type="button"
                  onClick={() => { setResetMethod("email"); setInputError(""); }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all ${
                    resetMethod === "email"
                      ? "bg-amber-primary text-bg-primary shadow-amber-subtle"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Email Address
                </button>
              </div>

              <form onSubmit={handleSendCode} className="space-y-4">
                {resetMethod === "phone" ? (
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary font-medium ml-1">Phone Number</label>
                    <div className="flex gap-2 relative">
                      <div className="relative country-selector">
                        <button
                          type="button"
                          onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                          className="flex items-center gap-1 h-12 px-3 rounded-xl bg-bg-primary/50 border border-border-default/60 text-sm font-medium text-text-primary transition-all"
                        >
                          <span>{selectedCountry.flag}</span>
                          <span>{selectedCountry.code}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
                        </button>

                        <AnimatePresence>
                          {isCountryDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute left-0 mt-2 w-40 rounded-xl bg-bg-elevated border border-border-default z-50 overflow-hidden py-1"
                            >
                              {countryCodes.map((item) => (
                                <button
                                  key={item.code}
                                  type="button"
                                  onClick={() => { setSelectedCountry(item); setIsCountryDropdownOpen(false); }}
                                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                                >
                                  <span>{item.flag} {item.code}</span>
                                  {selectedCountry.code === item.code && <Check className="w-3 h-3 text-amber-primary" />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="relative flex-1">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                        <Input
                          required
                          type="tel"
                          placeholder="98765 43210"
                          value={phoneNumber}
                          onChange={(e) => { setPhoneNumber(e.target.value.replace(/\D/g, "")); setInputError(""); }}
                          className="bg-bg-primary/50 border-border-default/60 pl-11 h-12 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary font-medium ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <Input
                        required
                        type="email"
                        placeholder="john@example.com"
                        value={emailAddress}
                        onChange={(e) => { setEmailAddress(e.target.value); setInputError(""); }}
                        className="bg-bg-primary/50 border-border-default/60 pl-11 h-12 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {inputError && (
                  <div className="flex items-center gap-1.5 text-error text-xs ml-1 bg-error-muted/40 p-2.5 rounded-xl border border-error/20">
                    <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                    <span>{inputError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="amber"
                  className="w-full h-12 rounded-xl text-base shadow-amber-glow mt-4 gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="w-5 h-5 rounded-full border-2 border-bg-primary border-t-transparent animate-spin" />
                  ) : (
                    <>
                      Send Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary transition-colors font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </Link>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <KeyRound className="w-12 h-12 text-amber-primary mx-auto mb-4 bg-amber-primary/10 p-2.5 rounded-2xl" />
                <h2 className="font-heading text-2xl font-bold text-text-primary">Verify Identity</h2>
                <p className="text-text-secondary text-sm mt-1.5 leading-relaxed">
                  We've sent a 6-digit verification code to your{" "}
                  {resetMethod === "phone" ? "phone number" : "email address"}.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="flex justify-between gap-2 max-w-sm mx-auto" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      required
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      ref={(el) => { otpRefs.current[index] = el; }}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-12 text-center text-xl font-bold text-text-primary bg-bg-primary/50 border border-border-default/80 focus:border-amber-primary focus:ring-2 focus:ring-amber-primary/20 rounded-xl outline-none transition-all"
                    />
                  ))}
                </div>

                {otpError && (
                  <div className="flex items-center justify-center gap-1.5 text-error text-xs text-center bg-error-muted/40 p-2.5 rounded-xl border border-error/20">
                    <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="amber"
                  className="w-full h-12 rounded-xl text-base shadow-amber-glow mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="w-5 h-5 rounded-full border-2 border-bg-primary border-t-transparent animate-spin" />
                  ) : (
                    "Verify & Continue"
                  )}
                </Button>
              </form>

              <div className="flex justify-between items-center text-sm pt-2 px-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-text-tertiary hover:text-text-primary transition-colors font-medium flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Change details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.success("New code sent!");
                    setOtp(["", "", "", "", "", ""]);
                    otpRefs.current[0]?.focus();
                  }}
                  className="text-amber-primary hover:underline font-semibold"
                >
                  Resend Code
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <ShieldCheck className="w-12 h-12 text-success mx-auto mb-4 bg-success-muted p-2.5 rounded-2xl" />
                <h2 className="font-heading text-2xl font-bold text-text-primary">Choose New Password</h2>
                <p className="text-text-secondary text-sm mt-1.5">
                  Set a secure, strong password for your account
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary font-medium ml-1">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <Input
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                      className="bg-bg-primary/50 border-border-default/60 pl-11 h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-text-secondary font-medium ml-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <Input
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                      className="bg-bg-primary/50 border-border-default/60 pl-11 h-12 rounded-xl"
                    />
                  </div>
                </div>

                {passwordError && (
                  <div className="flex items-center gap-1.5 text-error text-xs ml-1 bg-error-muted/40 p-2.5 rounded-xl border border-error/20">
                    <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 px-1 text-xs text-text-tertiary">
                  <input
                    type="checkbox"
                    id="show-pass-reset"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                    className="rounded border-border-default text-amber-primary focus:ring-amber-primary"
                  />
                  <label htmlFor="show-pass-reset" className="cursor-pointer">Show password</label>
                </div>

                <Button
                  type="submit"
                  variant="amber"
                  className="w-full h-12 rounded-xl text-base shadow-amber-glow mt-4"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="w-5 h-5 rounded-full border-2 border-bg-primary border-t-transparent animate-spin" />
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="text-center space-y-6 py-4"
            >
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-success/20 rounded-full blur-xl scale-125" />
                <CheckCircle2 className="w-16 h-16 text-success relative z-10 animate-bounce" />
              </div>

              <div>
                <h2 className="font-heading text-2xl font-bold text-text-primary">Success!</h2>
                <p className="text-text-secondary text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                  Your password has been reset successfully. You can now use your new password to sign in.
                </p>
              </div>

              <Button
                type="button"
                variant="amber"
                className="w-full h-12 rounded-xl text-base shadow-amber-glow"
                onClick={() => router.push("/login")}
              >
                Go to Sign In
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
