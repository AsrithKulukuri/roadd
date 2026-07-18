"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shared/logo";
import { Eye, EyeOff, User, Mail, Phone, Lock, ChevronDown, Check, Sparkles } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const countryCodes = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "USA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Validation Errors
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Password Strength State
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "", color: "bg-transparent" });

  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-transparent" };
    
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) {
      return { score: 1, label: "Weak", color: "bg-error" };
    } else if (score <= 4) {
      return { score: 2, label: "Medium", color: "bg-warning" };
    } else {
      return { score: 3, label: "Strong", color: "bg-success" };
    }
  };

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  const validateForm = () => {
    let isValid = true;

    if (!fullName.trim()) {
      setNameError("Full name is required");
      isValid = false;
    } else {
      setNameError("");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError("Email address is required");
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    } else {
      setEmailError("");
    }

    const rawPhone = phoneNumber.trim().replace(/\D/g, "");
    if (!rawPhone) {
      setPhoneError("Phone number is required");
      isValid = false;
    } else if (selectedCountry.code === "+91" && rawPhone.length !== 10) {
      setPhoneError("Please enter a valid 10-digit phone number");
      isValid = false;
    } else if (rawPhone.length < 7 || rawPhone.length > 15) {
      setPhoneError("Please enter a valid phone number");
      isValid = false;
    } else {
      setPhoneError("");
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      isValid = false;
    } else {
      setPasswordError("");
    }

    return isValid;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const fullPhone = `${selectedCountry.code}${phoneNumber.replace(/\D/g, "")}`;

    if (isSupabaseConfigured()) {
      try {
        // Sign up with Supabase Email & Password, passing full name & phone as metadata
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              full_name: fullName,
              phone: fullPhone,
              role: "buyer" // default role
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          const localUser = {
            name: fullName,
            email: email,
            phone: fullPhone,
            role: "buyer",
            isProfileComplete: true,
            isLoggedIn: true,
            authMethod: "email_phone"
          };
          localStorage.setItem("road_user", JSON.stringify(localUser));
          
          if (data.session) {
            toast.success("Account created successfully!");
            router.push("/dashboard");
          } else {
            toast.success("Registration successful! Please check your email for verification link.");
            router.push("/login");
          }
        }
      } catch (err: any) {
        console.error("Supabase registration error:", err);
        toast.error(err.message || "An error occurred during registration.");
        setIsLoading(false);
      }
    } else {
      // FALLBACK: Mock registration
      setTimeout(() => {
        setIsLoading(false);
        toast.success("Account created successfully! (Mock Mode)");

        const newUser = {
          name: fullName,
          email: email,
          phone: fullPhone,
          role: "buyer",
          isProfileComplete: true,
          isLoggedIn: true,
          authMethod: "email_phone"
        };

        localStorage.setItem("road_user", JSON.stringify(newUser));
        toast.info("Supabase keys not configured. Running in Mock Auth Mode.");
        router.push("/dashboard");
      }, 1500);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    
    if (isSupabaseConfigured()) {
      try {
        toast.info("Connecting to Supabase Google OAuth...");
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;
      } catch (err: any) {
        console.error("Google OAuth error:", err);
        toast.error(err.message || "OAuth connection failed.");
        setIsGoogleLoading(false);
      }
    } else {
      // FALLBACK: Mock Google sign-up
      toast.info("Connecting to Google Accounts (Mock)...");
      setTimeout(() => {
        setIsGoogleLoading(false);
        toast.success("Signed up with Google successfully! (Mock Mode)");

        const googleUser = {
          name: "Google User",
          email: "google.user@gmail.com",
          phone: "",
          role: "buyer",
          isProfileComplete: false,
          isLoggedIn: true,
          authMethod: "google"
        };

        localStorage.setItem("road_user", JSON.stringify(googleUser));
        toast.info("Supabase keys not configured. Running in Mock Auth Mode.");
        router.push("/dashboard");
      }, 1500);
    }
  };

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4 pt-28 pb-12 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-amber-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-amber-primary/5 rounded-full blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md glass border border-glass-border rounded-3xl p-8 shadow-elevated relative z-10"
      >
        <div className="flex flex-col items-center mb-6">
          <Logo size="lg" className="mb-4" />
          <h1 className="font-heading text-2xl font-bold text-text-primary tracking-tight">
            Create an Account
          </h1>
          <p className="text-text-secondary text-sm text-center mt-1">
            Join ROAD FACING to unlock premium properties
          </p>
        </div>

        {/* 1. Google OAuth */}
        <div className="space-y-4 mb-6">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl text-text-primary border-border-default/60 hover:bg-bg-hover/80 hover:border-amber-primary/50 gap-3 font-medium transition-all relative overflow-hidden active:scale-[0.98]"
            onClick={handleGoogleSignUp}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <span className="w-5 h-5 rounded-full border-2 border-amber-primary border-t-transparent animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.48 0-6.3-2.82-6.3-6.3s2.82-6.3 6.3-6.3c1.602 0 3.06.602 4.178 1.693l3.12-3.12C19.123 2.115 15.93 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.897 0 10.864-4.148 10.864-11.24 0-.668-.073-1.295-.192-1.955H12.24z"
                />
              </svg>
            )}
            {isGoogleLoading ? "Connecting..." : "Sign up with Google"}
          </Button>

          <div className="relative flex items-center justify-center my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border-default/50" />
            </div>
            <span className="relative px-3 bg-bg-card text-xs text-text-tertiary uppercase tracking-wider">
              Or sign up with details
            </span>
          </div>
        </div>

        {/* 2. Registration Fields */}
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
              <Input
                required
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (nameError) setNameError("");
                }}
                className="bg-bg-primary/50 border-border-default/60 pl-11 h-12 rounded-xl focus:border-amber-primary"
                disabled={isLoading || isGoogleLoading}
              />
            </div>
            {nameError && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[0.75rem] text-error font-medium ml-1 mt-1"
              >
                {nameError}
              </motion.p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
              <Input
                required
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                className="bg-bg-primary/50 border-border-default/60 pl-11 h-12 rounded-xl focus:border-amber-primary"
                disabled={isLoading || isGoogleLoading}
              />
            </div>
            {emailError && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[0.75rem] text-error font-medium ml-1 mt-1"
              >
                {emailError}
              </motion.p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium ml-1">Phone Number</label>
            <div className="flex gap-2 relative">
              <div className="relative country-selector">
                <button
                  type="button"
                  onClick={() => !isLoading && !isGoogleLoading && setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className="flex items-center gap-1.5 h-12 px-3 rounded-xl bg-bg-primary/50 border border-border-default/60 hover:border-amber-primary/30 text-sm font-medium text-text-primary transition-all active:scale-[0.98]"
                >
                  <span>{selectedCountry.flag}</span>
                  <span className="text-text-primary">{selectedCountry.code}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
                </button>

                <AnimatePresence>
                  {isCountryDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-44 rounded-xl bg-bg-elevated border border-border-default shadow-elevated z-50 overflow-hidden py-1.5"
                    >
                      {countryCodes.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(item);
                            setIsCountryDropdownOpen(false);
                          }}
                          className="flex items-center justify-between w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors text-left"
                        >
                          <span className="flex items-center gap-2">
                            <span>{item.flag}</span>
                            <span>{item.country} ({item.code})</span>
                          </span>
                          {selectedCountry.code === item.code && (
                            <Check className="w-3.5 h-3.5 text-amber-primary" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative flex-1">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                <Input
                  required
                  type="tel"
                  placeholder="98765 43210"
                  value={phoneNumber}
                  onChange={(e) => {
                    const rawVal = e.target.value.replace(/\D/g, "");
                    setPhoneNumber(rawVal);
                    if (phoneError) setPhoneError("");
                  }}
                  className="bg-bg-primary/50 border-border-default/60 pl-11 h-12 rounded-xl focus:border-amber-primary"
                  disabled={isLoading || isGoogleLoading}
                />
              </div>
            </div>
            {phoneError && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[0.75rem] text-error font-medium ml-1 mt-1"
              >
                {phoneError}
              </motion.p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
              <Input
                required
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                className="bg-bg-primary/50 border-border-default/60 pl-11 pr-10 h-12 rounded-xl focus:border-amber-primary"
                disabled={isLoading || isGoogleLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors focus:outline-none"
                disabled={isLoading || isGoogleLoading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {password.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2.5 space-y-1.5"
              >
                <div className="flex justify-between items-center px-1 text-xs">
                  <span className="text-text-tertiary">Password strength:</span>
                  <span className={
                    passwordStrength.label === "Weak" ? "text-error font-semibold animate-pulse" :
                    passwordStrength.label === "Medium" ? "text-warning font-semibold" :
                    passwordStrength.label === "Strong" ? "text-success font-bold flex items-center gap-0.5" : ""
                  }>
                    {passwordStrength.label === "Strong" && <Sparkles className="w-3 h-3 text-success animate-bounce" />}
                    {passwordStrength.label}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-1 h-1.5 w-full bg-border-default rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${
                    passwordStrength.score >= 1 ? passwordStrength.color : "bg-transparent"
                  }`} />
                  <div className={`h-full rounded-full transition-all duration-300 ${
                    passwordStrength.score >= 2 ? passwordStrength.color : "bg-transparent"
                  }`} />
                  <div className={`h-full rounded-full transition-all duration-300 ${
                    passwordStrength.score >= 3 ? passwordStrength.color : "bg-transparent"
                  }`} />
                </div>
                
                <p className="text-[0.68rem] text-text-tertiary px-1 leading-normal">
                  Tip: Combine uppercase, lowercase, numbers, and special characters (!@#$) for maximum security.
                </p>
              </motion.div>
            )}

            {passwordError && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[0.75rem] text-error font-medium ml-1 mt-1"
              >
                {passwordError}
              </motion.p>
            )}
          </div>

          <Button
            type="submit"
            variant="amber"
            className="w-full h-12 rounded-xl text-base shadow-amber-glow mt-6"
            disabled={isLoading || isGoogleLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 rounded-full border-2 border-bg-primary border-t-transparent animate-spin" />
                Creating account...
              </span>
            ) : (
              "Sign Up"
            )}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="text-amber-primary font-semibold hover:underline hover:text-amber-hover">
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
