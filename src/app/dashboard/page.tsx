"use client";

import { useState, useEffect } from "react";
import { 
  Building, 
  Heart, 
  Eye, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  X,
  Phone,
  Mail,
  Lock,
  ChevronDown,
  Check,
  Briefcase,
  UserCheck,
  ShieldAlert,
  Sparkles,
  LogOut,
  User,
  Shield,
  Calendar,
  CheckCircle,
  Edit3,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PropertyCard } from "@/components/property/property-card";
import { getRecentProperties } from "@/lib/mock-data";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const countryCodes = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "USA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
];

const roles = [
  { id: "buyer", title: "Buyer / Tenant", desc: "Looking to buy or rent a property", icon: Users },
  { id: "owner", title: "Property Owner", desc: "List and manage your own properties", icon: Building },
  { id: "agent", title: "Real Estate Agent", desc: "Represent buyers, tenants, or owners", icon: UserCheck },
  { id: "developer", title: "Builder / Developer", desc: "Advertise new construction projects", icon: Briefcase },
];

interface UserSession {
  name: string;
  email: string;
  phone: string;
  role: string;
  isProfileComplete: boolean;
  isVerified: boolean;
  isLoggedIn: boolean;
  authMethod?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const recentProperties = getRecentProperties(3);
  const [user, setUser] = useState<UserSession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Multi-phase wizard step (1: Role, 2: Contact, 3: Password)
  const [wizardStep, setWizardStep] = useState(1);

  // Profile completion form states
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("buyer");
  
  // Validation errors
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadLocalUser = () => {
    const stored = localStorage.getItem("road_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UserSession;
        
        // Sync isVerified state with registered users list fallback
        const registeredStr = localStorage.getItem("road_registered_users");
        if (registeredStr) {
          const registered = JSON.parse(registeredStr);
          const matched = registered.find((r: any) => r.email === parsed.email);
          if (matched) {
            parsed.isVerified = !!matched.isVerified;
          }
        }

        setUser(parsed);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.role) setSelectedRole(parsed.role);
      } catch (e) {
        console.error("Error reading fallback local user session:", e);
      }
    }
    setIsLoadingSession(false);
  };

  useEffect(() => {
    const fetchSessionUser = async () => {
      setIsLoadingSession(true);
      if (isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const u = session.user;
            const fullName = u.user_metadata?.full_name || u.user_metadata?.name || "Google User";
            const userPhone = u.phone || u.user_metadata?.phone || "";
            const userRole = u.user_metadata?.role || "buyer";
            const hasPhone = userPhone.length > 0;
            const isComplete = hasPhone && u.user_metadata?.isProfileComplete !== false;
            
            let isVerified = false;
            try {
              let { data: profile, error: profileErr } = await supabase
                .from("profiles")
                .select("is_verified")
                .eq("id", u.id)
                .single();
              
              // Fallback: Auto-upsert row if missing in database
              if (profileErr || !profile) {
                const { data: newProfile } = await supabase
                  .from("profiles")
                  .upsert({
                    id: u.id,
                    email: u.email,
                    full_name: fullName,
                    phone: userPhone,
                    role: userRole,
                    is_profile_complete: isComplete,
                    is_verified: false,
                    updated_at: new Date().toISOString()
                  })
                  .select()
                  .single();
                if (newProfile) {
                  profile = newProfile;
                }
              }

              if (profile) {
                isVerified = !!profile.is_verified;
              }
            } catch (err) {
              console.warn("Could not load or sync is_verified:", err);
            }

            const sessionUser = {
              name: fullName,
              email: u.email || "",
              phone: userPhone,
              role: userRole,
              isProfileComplete: isComplete,
              isVerified: isVerified,
              isLoggedIn: true,
              authMethod: session.user.app_metadata?.provider || "google"
            };

            setUser(sessionUser);
            localStorage.setItem("road_user", JSON.stringify(sessionUser));
            
            if (u.email) setEmail(u.email);
            if (userPhone) setPhone(userPhone);
            setSelectedRole(userRole);
          } else {
            loadLocalUser();
          }
        } catch (e) {
          console.error("Error loading session:", e);
          loadLocalUser();
        } finally {
          setIsLoadingSession(false);
        }
      } else {
        loadLocalUser();
      }
    };

    fetchSessionUser();
  }, []);

  // Automatically pop open the Complete Profile modal if user session is loaded and profile is incomplete
  useEffect(() => {
    if (user && !user.isProfileComplete && user.role !== "admin") {
      setIsModalOpen(true);
    }
  }, [user]);

  // Listen to cross-tab storage changes to dynamically sync the verification status in real-time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "road_user" && e.newValue) {
        try {
          setUser(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const nextWizardStep = () => {
    if (wizardStep === 1) {
      setWizardStep(2);
    } else if (wizardStep === 2) {
      // Validate Step 2 details (Email & Phone)
      let stepValid = true;
      
      const rawPhone = phone.trim().replace(/\D/g, "");
      if (!rawPhone) {
        setPhoneError("Phone number is required");
        stepValid = false;
      } else if (selectedCountry.code === "+91" && rawPhone.length !== 10) {
        setPhoneError("Please enter a valid 10-digit number");
        stepValid = false;
      } else {
        setPhoneError("");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim()) {
        setEmailError("Email is required");
        stepValid = false;
      } else if (!emailRegex.test(email)) {
        setEmailError("Please enter a valid email address");
        stepValid = false;
      } else {
        setEmailError("");
      }

      if (stepValid) setWizardStep(3);
    }
  };

  const prevWizardStep = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  const validateFinalStep = () => {
    if (!password) {
      setPasswordError("Password is required");
      return false;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleCompleteProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFinalStep()) return;

    setIsSubmitting(true);
    const fullPhone = `${selectedCountry.code}${phone.replace(/\D/g, "")}`;
    
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.updateUser({
          phone: fullPhone,
          data: {
            full_name: user?.name || "Google User",
            phone: fullPhone,
            role: selectedRole,
            isProfileComplete: true
          }
        });

        if (error) {
          console.warn("Direct phone write failed, falling back to metadata update:", error.message);
          const { error: fallbackError } = await supabase.auth.updateUser({
            data: {
              full_name: user?.name || "Google User",
              phone: fullPhone,
              role: selectedRole,
              isProfileComplete: true
            }
          });

          if (fallbackError) throw fallbackError;
        }

        const updatedUser: UserSession = {
          name: user?.name || "Google User",
          email: email,
          phone: fullPhone,
          role: selectedRole,
          isProfileComplete: true,
          isVerified: false,
          isLoggedIn: true,
          authMethod: user?.authMethod || "google"
        };

        localStorage.setItem("road_user", JSON.stringify(updatedUser));
        setUser(updatedUser);

        // Directly write details to public.profiles database table for future queries
        try {
          const { data: authUserObj } = await supabase.auth.getUser();
          if (authUserObj?.user) {
            const { error: dbError } = await supabase
              .from("profiles")
              .upsert({
                id: authUserObj.user.id,
                email: email,
                phone: fullPhone,
                full_name: user?.name || "Google User",
                role: selectedRole,
                is_profile_complete: true,
                is_verified: false,
                updated_at: new Date().toISOString()
              });
            
            if (dbError) {
              console.warn("Direct profiles table write failed:", dbError.message);
            }
          }
        } catch (dbErr) {
          console.warn("Direct DB sync skipped:", dbErr);
        }

        setIsModalOpen(false);
        setIsSubmitting(false);
        toast.success("Profile updated successfully on Supabase!");
      } catch (err: any) {
        console.error("Supabase profile completion update failed:", err);
        toast.error(err.message || "Failed to update profile details.");
        setIsSubmitting(false);
      }
    } else {
      setTimeout(() => {
        setIsSubmitting(false);
        
        const updatedUser: UserSession = {
          name: user?.name || "Google User",
          email: email,
          phone: fullPhone,
          role: selectedRole,
          isProfileComplete: true,
          isVerified: false,
          isLoggedIn: true,
          authMethod: user?.authMethod || "google"
        };

        localStorage.setItem("road_user", JSON.stringify(updatedUser));
        setUser(updatedUser);

        // Save user into registered users list so admin page can pull them
        const registeredStr = localStorage.getItem("road_registered_users") || "[]";
        try {
          const registered = JSON.parse(registeredStr);
          const idx = registered.findIndex((r: any) => r.email === email);
          const regObj = {
            id: email, 
            name: user?.name || "Google User",
            email: email,
            phone: fullPhone,
            role: selectedRole,
            isProfileComplete: true,
            isVerified: false
          };
          if (idx >= 0) {
            registered[idx] = regObj;
          } else {
            registered.push(regObj);
          }
          localStorage.setItem("road_registered_users", JSON.stringify(registered));
        } catch(e) {}

        setIsModalOpen(false);
        toast.success("Profile completed successfully! (Mock Mode)");
      }, 1500);
    }
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("road_user");
    setUser(null);
    setIsModalOpen(false);
    toast.success("Signed out successfully.");
    router.push("/login");
  };

  const stats = [
    { title: "Total Views", value: "12,450", icon: Eye, trend: "+12.5%" },
    { title: "Active Listings", value: "8", icon: Building, trend: "+2" },
    { title: "Saved Properties", value: "24", icon: Heart, trend: "+4" },
    { title: "New Leads", value: "15", icon: Users, trend: "+5.2%" },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // If user profile is not complete, do NOT allow clicking outside to close
      if (user && !user.isProfileComplete) return;

      const target = e.target as HTMLElement;
      if (!target.closest(".modal-country-selector")) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [user]);

  const getRoleLabel = (roleId?: string) => {
    const found = roles.find(r => r.id === roleId);
    return found ? found.title : "User";
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-3 border-amber-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const isProfileSetupForced = user && !user.isProfileComplete;

  return (
    <div className="space-y-8 max-w-7xl mx-auto relative">
      
      {/* Header and Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary tracking-tight">
            {isAdmin ? "Dashboard Overview" : "My Profile"}
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Welcome back, <span className="text-text-primary font-semibold">{user?.name || "Vikram"}</span>. Here's your workspace.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSignOut} 
          className="border-border-default hover:bg-error/10 hover:text-error hover:border-error/20 flex gap-2 w-fit"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>

      {/* Profile Incomplete Banner Card */}
      {user && !user.isProfileComplete && (
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-gradient-to-r from-amber-primary/10 via-amber-primary/5 to-transparent border border-amber-primary/20 rounded-3xl relative overflow-hidden">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-amber-primary/10 flex items-center justify-center flex-shrink-0 border border-amber-primary/30">
                  <ShieldAlert className="h-6 w-6 text-amber-primary animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-heading text-lg font-bold text-text-primary flex items-center gap-2">
                    Complete Your Profile Setup First
                    <span className="text-[0.68rem] font-bold uppercase tracking-wider bg-amber-primary/20 text-amber-primary px-2 py-0.5 rounded-full">
                      Step {wizardStep} of 3
                    </span>
                  </h3>
                  <p className="text-text-secondary text-sm max-w-2xl leading-relaxed">
                    Please complete all setup phases. Select your platform role, input phone details, and set a password to unlock full dashboard operations.
                  </p>
                  
                  <div className="w-full bg-border-default/60 h-2 rounded-full max-w-md mt-3 overflow-hidden">
                    <div className="bg-amber-primary h-full rounded-full transition-all duration-500" style={{ width: `${(wizardStep / 3) * 100}%` }} />
                  </div>
                </div>
              </div>
              <Button
                variant="amber"
                className="shadow-amber-glow h-11 rounded-xl px-6 self-start md:self-auto font-semibold flex items-center gap-1.5"
                onClick={() => setIsModalOpen(true)}
              >
                <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: "3s" }} />
                Open Setup phases
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Conditional Rendering Based on User Role */}
      {isAdmin ? (
        /* ==================== ADMIN DASHBOARD ==================== */
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Card key={i} className="bg-bg-card border-border-default hover:border-amber-primary/10 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-text-secondary">{stat.title}</p>
                        <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-amber-primary/10 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-amber-primary" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                      <TrendingUp className="h-4 w-4 text-success mr-1" />
                      <span className="text-success font-medium">{stat.trend}</span>
                      <span className="text-text-tertiary ml-1">from last month</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-xl font-bold text-text-primary">Your Recent Listings</h2>
                <button className="text-sm text-amber-primary hover:underline font-medium">View all</button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {recentProperties.slice(0, 2).map((property, i) => (
                  <PropertyCard key={property.id} property={property} index={i} />
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="font-heading text-xl font-bold text-text-primary">Recent Messages</h2>
              <Card className="bg-bg-card border-border-default">
                <CardContent className="p-0">
                  {[
                    { name: "Priya Mehta", time: "2 hours ago", msg: "Is the Rushikonda villa still available?" },
                    { name: "Rahul Gupta", time: "5 hours ago", msg: "Can we schedule a visit tomorrow?" },
                    { name: "Amit Kumar", time: "1 day ago", msg: "What is the final negotiable price?" },
                  ].map((msg, i) => (
                    <div key={i} className={`p-4 flex gap-4 ${i !== 0 ? "border-t border-border-default/50" : ""}`}>
                      <div className="w-10 h-10 rounded-full bg-bg-hover flex items-center justify-center flex-shrink-0 text-text-primary font-bold">
                        {msg.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold text-text-primary text-sm">{msg.name}</h4>
                          <span className="text-xs text-text-tertiary">{msg.time}</span>
                        </div>
                        <p className="text-sm text-text-secondary line-clamp-1">{msg.msg}</p>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 border-t border-border-default/50 text-center">
                    <button className="text-sm text-amber-primary font-medium hover:underline">View all messages</button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== NORMAL USER PROFILE ==================== */
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <Card className="bg-bg-card border border-border-default rounded-3xl overflow-hidden shadow-elevated">
            <div className="h-32 bg-gradient-to-r from-amber-primary/30 via-amber-primary/10 to-transparent relative" />
            
            <CardContent className="p-8 -mt-16 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-border-default/60">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
                  <div className="w-28 h-28 rounded-full border-4 border-bg-card bg-bg-primary flex items-center justify-center text-text-primary font-bold font-heading text-4xl shadow-md relative group overflow-hidden">
                    {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-12 h-12 text-text-tertiary" />}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer" onClick={() => setIsModalOpen(true)}>
                      <Edit3 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5 justify-center sm:justify-start">
                      <h2 className="font-heading text-2xl font-bold text-text-primary tracking-tight">
                        {user?.name || "Vikram"}
                      </h2>
                      {!user?.isProfileComplete ? (
                        <span className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider bg-error-muted text-error px-2 py-0.5 rounded-full border border-error/15">
                          Incomplete Setup
                        </span>
                      ) : !user?.isVerified ? (
                        <span className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Pending Verification
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider bg-success-muted text-success px-2.5 py-0.5 rounded-full border border-success/15">
                          <CheckCircle className="w-3.5 h-3.5 text-success" /> Verified Profile
                        </span>
                      )}
                    </div>
                    
                    <p className="text-text-secondary text-sm font-medium flex items-center gap-1.5 justify-center sm:justify-start">
                      <Shield className="w-4 h-4 text-amber-primary" />
                      {getRoleLabel(user?.role)}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="rounded-xl h-11 px-5 border-border-default hover:border-amber-primary/30 flex gap-2 font-medium"
                  onClick={() => { setWizardStep(1); setIsModalOpen(true); }}
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </Button>
              </div>

              <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-4 items-start p-4 rounded-2xl bg-bg-primary/30 border border-border-default/40">
                  <div className="w-10 h-10 rounded-xl bg-amber-primary/10 flex items-center justify-center text-amber-primary flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5 leading-normal">
                    <div className="text-xs text-text-tertiary font-bold uppercase tracking-wider">Email Address</div>
                    <div className="text-text-primary text-sm font-medium break-all">{user?.email || "Not Provided"}</div>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-2xl bg-bg-primary/30 border border-border-default/40">
                  <div className="w-10 h-10 rounded-xl bg-amber-primary/10 flex items-center justify-center text-amber-primary flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5 leading-normal">
                    <div className="text-xs text-text-tertiary font-bold uppercase tracking-wider">Phone Number</div>
                    <div className="text-text-primary text-sm font-medium">{user?.phone || "Not Provided"}</div>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-2xl bg-bg-primary/30 border border-border-default/40">
                  <div className="w-10 h-10 rounded-xl bg-amber-primary/10 flex items-center justify-center text-amber-primary flex-shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5 leading-normal">
                    <div className="text-xs text-text-tertiary font-bold uppercase tracking-wider">Login Method</div>
                    <div className="text-text-primary text-sm font-medium capitalize">{user?.authMethod || "Email & Password"}</div>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-2xl bg-bg-primary/30 border border-border-default/40">
                  <div className="w-10 h-10 rounded-xl bg-amber-primary/10 flex items-center justify-center text-amber-primary flex-shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5 leading-normal">
                    <div className="text-xs text-text-tertiary font-bold uppercase tracking-wider">Account Status</div>
                    <div className="text-text-primary text-sm font-medium">Active Member</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Multi-Phase Profile Completion Dialog Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal backdrop - disable exit click if forced setup */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isProfileSetupForced) setIsModalOpen(false);
              }}
              className={`absolute inset-0 bg-black/70 backdrop-blur-md ${isProfileSetupForced ? "cursor-not-allowed" : "cursor-pointer"}`}
            />
            
            {/* Modal window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              className="w-full max-w-lg glass border border-glass-border bg-bg-card rounded-3xl p-6 md:p-8 shadow-elevated relative z-10 overflow-hidden"
            >
              {/* Close Button - hide if setup is forced */}
              {!isProfileSetupForced && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="absolute right-4 top-4 text-text-tertiary hover:text-text-primary p-1 bg-bg-primary/50 rounded-full border border-border-default/50 transition-all hover:scale-105 active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Step indicator header */}
              <div className="mb-6 space-y-1.5">
                <div className="flex justify-between items-center text-xs text-amber-primary font-bold uppercase tracking-wider">
                  <span>Profile Configuration</span>
                  <span>Phase {wizardStep} of 3</span>
                </div>
                
                {/* Visual Step Progress Bar */}
                <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full bg-border-default rounded-full overflow-hidden mt-1.5">
                  <div className={`h-full rounded-full transition-all duration-300 ${wizardStep >= 1 ? "bg-amber-primary" : "bg-transparent"}`} />
                  <div className={`h-full rounded-full transition-all duration-300 ${wizardStep >= 2 ? "bg-amber-primary" : "bg-transparent"}`} />
                  <div className={`h-full rounded-full transition-all duration-300 ${wizardStep >= 3 ? "bg-amber-primary" : "bg-transparent"}`} />
                </div>
              </div>

              <form onSubmit={handleCompleteProfileSubmit} className="space-y-6">
                <AnimatePresence mode="wait">
                  {/* PHASE 1: ROLE SELECTION */}
                  {wizardStep === 1 && (
                    <motion.div
                      key="wizard-1"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      className="space-y-4"
                    >
                      <div className="space-y-1">
                        <h3 className="font-heading text-lg font-bold text-text-primary leading-tight">Phase 1: Choose Your Role</h3>
                        <p className="text-text-secondary text-xs leading-normal">
                          Select the account classification that best matches your portal usage.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {roles.map((role) => {
                          const Icon = role.icon;
                          const isSelected = selectedRole === role.id;
                          return (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => setSelectedRole(role.id)}
                              className={`p-3 text-left rounded-2xl border transition-all flex items-start gap-3 active:scale-[0.98] ${
                                isSelected 
                                  ? "bg-amber-primary/10 border-amber-primary/60 text-amber-primary shadow-amber-subtle" 
                                  : "bg-bg-primary/40 border-border-default/60 text-text-secondary hover:text-text-primary hover:border-amber-primary/30"
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isSelected ? "bg-amber-primary/20 text-amber-primary" : "bg-bg-hover text-text-tertiary"
                              }`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="space-y-0.5 leading-normal">
                                <div className="font-bold text-xs text-text-primary">{role.title}</div>
                                <div className="text-[0.68rem] text-text-tertiary">{role.desc}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-border-default/50 mt-6 justify-end">
                        {isProfileSetupForced ? (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={handleSignOut}
                            className="text-error hover:bg-error/10 hover:text-error mr-auto flex gap-1.5 h-12 rounded-xl text-sm"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out & Exit
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                            className="h-12 rounded-xl text-sm flex-1"
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="amber"
                          onClick={nextWizardStep}
                          className="h-12 rounded-xl text-sm px-6 font-semibold flex gap-1.5 shadow-amber-glow"
                        >
                          Next: Contact details
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* PHASE 2: CONTACT DETAILS */}
                  {wizardStep === 2 && (
                    <motion.div
                      key="wizard-2"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      className="space-y-4"
                    >
                      <div className="space-y-1">
                        <h3 className="font-heading text-lg font-bold text-text-primary leading-tight">Phase 2: Contact Details</h3>
                        <p className="text-text-secondary text-xs leading-normal">
                          Provide your registered email address and a contact mobile number.
                        </p>
                      </div>

                      {/* Email Address */}
                      <div className="space-y-1 pt-2">
                        <label className="text-xs text-text-secondary font-medium ml-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                          <Input
                            required
                            type="email"
                            placeholder="john@example.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                            className="bg-bg-primary/40 border-border-default/60 pl-11 h-12 rounded-xl focus:border-amber-primary"
                          />
                        </div>
                        {emailError && <p className="text-[0.72rem] text-error font-medium ml-1 mt-0.5">{emailError}</p>}
                      </div>

                      {/* Phone Number with Picker */}
                      <div className="space-y-1">
                        <label className="text-xs text-text-secondary font-medium ml-1">Phone Number</label>
                        <div className="flex gap-2 relative">
                          <div className="relative modal-country-selector flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                              className="flex items-center gap-1.5 h-12 px-3 rounded-xl bg-bg-primary/40 border border-border-default/60 hover:border-amber-primary/30 text-sm font-medium text-text-primary transition-all"
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
                                  className="absolute left-0 mt-2 w-40 rounded-xl bg-bg-elevated border border-border-default shadow-elevated z-50 overflow-hidden py-1"
                                >
                                  {countryCodes.map((item) => (
                                    <button
                                      key={item.code}
                                      type="button"
                                      onClick={() => { setSelectedCountry(item); setIsCountryDropdownOpen(false); }}
                                      className="flex items-center justify-between w-full px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                                    >
                                      <span>{item.flag} {item.code}</span>
                                      {selectedCountry.code === item.code && <Check className="w-3.5 h-3.5 text-amber-primary" />}
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
                              value={phone}
                              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setPhoneError(""); }}
                              className="bg-bg-primary/40 border-border-default/60 pl-11 h-12 rounded-xl focus:border-amber-primary"
                            />
                          </div>
                        </div>
                        {phoneError && <p className="text-[0.72rem] text-error font-medium ml-1 mt-0.5">{phoneError}</p>}
                      </div>

                      <div className="flex gap-3 pt-6 border-t border-border-default/50 mt-6">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={prevWizardStep}
                          className="h-12 rounded-xl text-sm flex gap-1.5 items-center justify-center font-semibold"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back
                        </Button>
                        <Button
                          type="button"
                          variant="amber"
                          onClick={nextWizardStep}
                          className="h-12 rounded-xl text-sm flex-1 font-semibold flex gap-1.5 items-center justify-center shadow-amber-glow"
                        >
                          Continue
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* PHASE 3: SET PASSWORD */}
                  {wizardStep === 3 && (
                    <motion.div
                      key="wizard-3"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      className="space-y-4"
                    >
                      <div className="space-y-1">
                        <h3 className="font-heading text-lg font-bold text-text-primary leading-tight">Phase 3: Secure Account</h3>
                        <p className="text-text-secondary text-xs leading-normal">
                          Define a profile login password so you can sign in directly using credentials in future.
                        </p>
                      </div>

                      <div className="space-y-1 pt-2">
                        <label className="text-xs text-text-secondary font-medium ml-1">Choose Login Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                          <Input
                            required
                            type="password"
                            placeholder="At least 6 characters"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                            className="bg-bg-primary/40 border-border-default/60 pl-11 h-12 rounded-xl focus:border-amber-primary"
                          />
                        </div>
                        {passwordError && <p className="text-[0.72rem] text-error font-medium ml-1 mt-0.5">{passwordError}</p>}
                      </div>

                      <div className="flex gap-3 pt-6 border-t border-border-default/50 mt-6">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={prevWizardStep}
                          className="h-12 rounded-xl text-sm flex gap-1.5 items-center justify-center font-semibold"
                          disabled={isSubmitting}
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back
                        </Button>
                        <Button
                          type="submit"
                          variant="amber"
                          className="h-12 rounded-xl text-sm flex-1 font-semibold flex gap-1.5 items-center justify-center shadow-amber-glow"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-5 h-5 rounded-full border-2 border-bg-primary border-t-transparent animate-spin" />
                              Completing Setup...
                            </span>
                          ) : (
                            <>
                              Complete Profile
                              <Check className="w-4 h-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
