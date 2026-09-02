"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  UserCheck, 
  UserX,
  Phone,
  Mail
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  provider?: string;
  isProfileComplete: boolean;
  isVerified: boolean;
  createdAt?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        throw new Error(data.error || "Failed to load users");
      }
    } catch (err: any) {
      console.error("Error fetching users from API:", err);
      // Fallback to client Supabase or localStorage
      if (isSupabaseConfigured()) {
        try {
          const { data: profiles } = await supabase.from("user_profiles").select("*");
          if (profiles && profiles.length > 0) {
            setUsers(profiles.map((p: any) => ({
              id: p.id,
              name: p.full_name || (p.phone ? `Member (${p.phone})` : "Registered User"),
              email: p.email || "",
              phone: p.phone || "",
              role: p.role || "buyer",
              isProfileComplete: Boolean(p.is_profile_complete),
              isVerified: Boolean(p.is_verified),
            })));
          }
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleVerifyUser = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "verify" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("User verified successfully!");
        fetchUsers();
      } else {
        toast.error(data.error || "Failed to verify user");
      }
    } catch (err: any) {
      toast.error(err.message || "Verification request failed");
    }
  };

  const handleRevokeUser = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "revoke" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("User verification revoked.");
        fetchUsers();
      } else {
        toast.error(data.error || "Failed to revoke verification");
      }
    } catch (err: any) {
      toast.error(err.message || "Revoke request failed");
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-heading text-text-primary tracking-tight">User Verifications</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Review details and grant verified badges to eliminate scam profiles.
        </p>
      </div>

      <div className="bg-bg-card border border-border-default rounded-3xl overflow-hidden shadow-elevated">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center">
              <span className="w-8 h-8 rounded-full border-3 border-amber-primary border-t-transparent animate-spin inline-block" />
              <p className="text-xs text-text-tertiary mt-2">Loading user queue...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-text-secondary">
              <Users className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
              No registered profiles found on the platform.
            </div>
          ) : (
            <>
              {/* Mobile View: User Cards */}
              <div className="block md:hidden divide-y divide-border-subtle">
                {users.map((profile) => (
                  <div key={profile.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-primary/10 flex items-center justify-center text-amber-primary shrink-0 font-bold font-heading">
                        {(profile.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-text-primary text-sm flex items-center gap-1.5 truncate">
                          <span className="truncate">{profile.name}</span>
                          {profile.role === "admin" && (
                            <span className="text-[0.625rem] bg-amber-500/15 text-amber-400 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0">
                              Staff
                            </span>
                          )}
                          {profile.provider === "whatsapp" && (
                            <span className="text-[0.625rem] bg-emerald-500/15 text-emerald-600 font-medium px-1.5 py-0.5 rounded shrink-0">
                              WhatsApp
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-text-tertiary flex items-center gap-1 truncate mt-0.5">
                          {profile.email ? (
                            <><Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{profile.email}</span></>
                          ) : profile.phone ? (
                            <><Phone className="w-3 h-3 shrink-0" /> <span className="truncate">{profile.phone}</span></>
                          ) : (
                            <span>Registered Member</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border-subtle">
                      <div className="flex items-center gap-1.5">
                        {profile.role === "admin" ? (
                          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : profile.role === "agent" ? (
                          <ShieldCheck className="w-4 h-4 text-amber-primary shrink-0" />
                        ) : (
                          <Shield className="w-4 h-4 text-text-tertiary shrink-0" />
                        )}
                        <span className="font-semibold text-text-primary capitalize">{profile.role}</span>
                      </div>

                      <div>
                        {profile.isVerified ? (
                          <span className="flex items-center gap-1 text-xs text-success font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : profile.isProfileComplete || profile.phone ? (
                          <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                            <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-text-tertiary">
                            <AlertCircle className="w-3.5 h-3.5" /> Unverified
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-end">
                      {profile.role === "admin" ? (
                        <span className="text-xs text-text-tertiary italic">Admin Override</span>
                      ) : !profile.isVerified ? (
                        <Button
                          size="sm"
                          variant="amber"
                          className="h-8 w-full sm:w-auto rounded-lg text-xs font-semibold gap-1"
                          onClick={() => handleVerifyUser(profile.id)}
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Verify User
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-error hover:bg-error/10 hover:text-error gap-1"
                          onClick={() => handleRevokeUser(profile.id)}
                        >
                          <UserX className="w-3.5 h-3.5" /> Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm text-text-secondary">
                  <thead className="bg-bg-primary/50 text-text-primary border-b border-border-default uppercase text-xs font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">User Info</th>
                      <th className="px-6 py-4">Role / Details</th>
                      <th className="px-6 py-4">Setup Progress</th>
                      <th className="px-6 py-4">Verification Status</th>
                      <th className="px-6 py-4 text-right">Approve Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {users.map((profile) => (
                      <tr key={profile.id} className="hover:bg-bg-primary/20 transition-colors">
                        
                        {/* User Info Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-primary/10 flex items-center justify-center text-amber-primary shrink-0 font-bold font-heading">
                              {(profile.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                                {profile.name}
                                {profile.role === "admin" && (
                                  <span className="text-[0.625rem] bg-amber-500/15 text-amber-400 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                                    Staff
                                  </span>
                                )}
                                {profile.provider === "whatsapp" && (
                                  <span className="text-[0.625rem] bg-emerald-500/15 text-emerald-600 font-medium px-1.5 py-0.5 rounded">
                                    WhatsApp
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-text-tertiary flex items-center gap-1 mt-0.5">
                                {profile.email ? (
                                  <><Mail className="w-3 h-3 text-text-tertiary" /> {profile.email}</>
                                ) : profile.phone ? (
                                  <><Phone className="w-3 h-3 text-text-tertiary" /> {profile.phone}</>
                                ) : (
                                  <span>Registered Member</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {profile.role === "admin" ? (
                                <ShieldAlert className="w-4 h-4 text-amber-400" />
                              ) : profile.role === "agent" ? (
                                <ShieldCheck className="w-4 h-4 text-amber-primary" />
                              ) : (
                                <Shield className="w-4 h-4 text-text-tertiary" />
                              )}
                              <span className="font-semibold text-text-primary capitalize text-xs">{profile.role}</span>
                            </div>
                            {profile.phone && (
                              <div className="text-xs text-text-tertiary flex items-center gap-1">
                                <Phone className="w-3 h-3 text-text-tertiary" /> {profile.phone}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Setup Progress */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {profile.isProfileComplete ? (
                            <span className="px-2 py-0.5 rounded-full text-[0.68rem] font-bold bg-success-muted text-success border border-success/15 uppercase tracking-wide">
                              Phase Complete
                            </span>
                          ) : profile.phone ? (
                            <span className="px-2 py-0.5 rounded-full text-[0.68rem] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-wide">
                              Phone Verified
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[0.68rem] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-wide">
                              Pending Profile
                            </span>
                          )}
                        </td>

                        {/* Status Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {profile.isVerified ? (
                            <span className="flex items-center gap-1.5 text-xs text-success font-semibold">
                              <CheckCircle className="w-4 h-4 text-success" />
                              Verified
                            </span>
                          ) : profile.isProfileComplete || profile.phone ? (
                            <span className="flex items-center gap-1.5 text-xs text-amber-500 font-semibold">
                              <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                              Pending Review
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
                              <AlertCircle className="w-4 h-4 text-text-tertiary" />
                              Unverified
                            </span>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {profile.role === "admin" ? (
                            <span className="text-xs text-text-tertiary italic">Admin Override</span>
                          ) : !profile.isVerified ? (
                            <Button
                              size="sm"
                              variant="amber"
                              className="h-8 rounded-lg text-xs font-semibold gap-1"
                              onClick={() => handleVerifyUser(profile.id)}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Verify User
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-lg text-xs text-error hover:bg-error/10 hover:text-error gap-1"
                              onClick={() => handleRevokeUser(profile.id)}
                            >
                              <UserX className="w-3.5 h-3.5" />
                              Revoke
                            </Button>
                          )}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
