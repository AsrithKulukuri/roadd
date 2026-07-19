"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shared/logo";
import { Eye, EyeOff, Phone, Mail, Lock, ChevronDown, Check, Shield, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

const countryCodes = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "USA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
];

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  
  // Form fields
  const [loginInput, setLoginInput] = useState(""); // Can be email or phone number
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Validation errors
  const [inputError, setInputError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Determine if user is typing an email or logging in as admin (admins must use email)
  const isEmailInput = isAdminLogin || loginInput.trim().includes("@") || /[a-zA-Z]/.test(loginInput.trim());

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const role = session.user.user_metadata?.role;
        router.push(role === "admin" ? "/admin" : "/dashboard");
      }
    };
    checkUser();
  }, [router]);

  const validateForm = () => {
    let isValid = true;
    const inputVal = loginInput.trim();

    if (!inputVal) {
      setInputError("Email or phone number is required");
      isValid = false;
    } else if (isEmailInput) {
      // Validate Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inputVal)) {
        setInputError("Please enter a valid email address");
        isValid = false;
      } else {
        setInputError("");
      }
    } else {
      // Validate Phone
      const rawPhone = inputVal.replace(/\D/g, "");
      if (selectedCountry.code === "+91" && rawPhone.length !== 10) {
        setInputError("Please enter a valid 10-digit phone number");
        isValid = false;
      } else if (rawPhone.length < 7 || rawPhone.length > 15) {
        setInputError("Please enter a valid phone number");
        isValid = false;
      } else {
        setInputError("");
      }
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const inputVal = loginInput.trim();

    try {
      let response;
      let userPhone = "";
      
      if (isEmailInput) {
        response = await supabase.auth.signInWithPassword({
          email: inputVal,
          password: password,
        });
      } else {
        userPhone = `${selectedCountry.code}${inputVal.replace(/\D/g, "")}`;
        response = await supabase.auth.signInWithPassword({
          phone: userPhone,
          password: password,
        });
      }

      const { data, error } = response;

      if (error) throw error;

      if (data.user) {
        const role = data.user.user_metadata?.role || "buyer";
        toast.success("Logged in successfully!");
        router.push(role === "admin" ? "/admin" : "/dashboard");
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
      if (err.message?.includes("Phone logins are disabled")) {
        toast.error("Phone logins are disabled.", {
          description: "Please sign in with your email address instead.",
          duration: 8000
        });
      } else {
        toast.error(err.message || "Invalid login credentials.");
      }
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Google OAuth error:", err);
      toast.error(err.message || "Google sign-in failed.");
      setIsGoogleLoading(false);
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
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-primary/5 rounded-full blur-[150px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md glass border border-glass-border rounded-3xl p-8 shadow-elevated relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" className="mb-6" />
          <h1 className="font-heading text-2xl font-bold text-text-primary tracking-tight">
            {isAdminLogin ? "Admin Dashboard Login" : "Welcome Back"}
          </h1>
          <p className="text-text-secondary text-sm text-center mt-2">
            {isAdminLogin 
              ? "Sign in to access admin privileges" 
              : "Access India's premium real estate portal"}
          </p>
        </div>

        {/* 1. Google OAuth Sign In */}
        <div className="space-y-4 mb-6">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl text-text-primary border-border-default/60 hover:bg-bg-hover/80 hover:border-amber-primary/50 gap-3 font-medium transition-all relative overflow-hidden active:scale-[0.98]"
            onClick={handleGoogleSignIn}
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
            {isGoogleLoading ? "Connecting..." : "Continue with Google"}
          </Button>

          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border-default/50" />
            </div>
            <span className="relative px-3 bg-bg-card text-xs text-text-tertiary uppercase tracking-wider">
              Or sign in below
            </span>
          </div>
        </div>

        {/* 2. Unified Email or Phone & Password */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium ml-1">{isAdminLogin ? "Admin Email Address" : "Email or Phone Number"}</label>
            <div className="flex gap-2 relative">
              
              {/* Dynamic Country Selector (only shown if user is NOT typing an email) */}
              <AnimatePresence initial={false}>
                {!isEmailInput && (
                  <motion.div
                    initial={{ opacity: 0, width: 0, marginRight: 0 }}
                    animate={{ opacity: 1, width: "auto", marginRight: 8 }}
                    exit={{ opacity: 0, width: 0, marginRight: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative country-selector flex-shrink-0"
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Box */}
              <div className="relative flex-1">
                {isEmailInput ? (
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                ) : (
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                )}
                <Input
                  required
                  type="text"
                  placeholder={isAdminLogin ? "admin@road.com" : isEmailInput ? "john@example.com" : "98765 43210"}
                  value={loginInput}
                  onChange={(e) => {
                    setLoginInput(e.target.value);
                    if (inputError) setInputError("");
                  }}
                  className="bg-bg-primary/50 border-border-default/60 pl-11 h-12 rounded-xl focus:border-amber-primary"
                  disabled={isLoading || isGoogleLoading}
                />
              </div>
            </div>
            
            {inputError && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[0.75rem] text-error font-medium ml-1 mt-1"
              >
                {inputError}
              </motion.p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs text-text-secondary font-medium">Password</label>
              <Link 
                href="/forgot-password" 
                className="text-xs text-amber-primary font-medium hover:underline hover:text-amber-hover"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
              <Input
                required
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
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
          
          <div className="flex justify-between items-center text-sm pt-1">
            <button 
              type="button"
              onClick={() => setIsAdminLogin(!isAdminLogin)}
              className="flex items-center gap-1.5 text-text-tertiary hover:text-amber-primary text-xs font-semibold tracking-wide uppercase transition-colors"
              disabled={isLoading || isGoogleLoading}
            >
              <Shield className="w-3.5 h-3.5" />
              {isAdminLogin ? "Sign In as Regular User" : "Sign In as Admin"}
            </button>
          </div>

          <Button 
            type="submit" 
            variant="amber" 
            className="w-full h-12 rounded-xl text-base shadow-amber-glow mt-4"
            disabled={isLoading || isGoogleLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 rounded-full border-2 border-bg-primary border-t-transparent animate-spin" />
                Signing in...
              </span>
            ) : (
              isAdminLogin ? "Sign In as Admin" : "Sign In"
            )}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-text-secondary">
          Don't have an account?{" "}
          <Link href="/register" className="text-amber-primary font-semibold hover:underline hover:text-amber-hover">
            Sign Up
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
