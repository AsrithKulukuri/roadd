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
  isProfileComplete: boolean;
  isVerified: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*");
          
        if (error) throw error;
        
        if (data) {
          const mapped: ProfileUser[] = data.map((p: any) => ({
            id: p.id,
            name: p.full_name || "Google User",
            email: p.email || "",
            phone: p.phone || "",
            role: p.role || "buyer",
            isProfileComplete: !!p.is_profile_complete,
            isVerified: !!p.is_verified
          }));
          setUsers(mapped);
        }
      } catch (err: any) {
        console.error("Error fetching profiles from Supabase:", err);
        toast.error("Failed to load profiles from database.");
        loadFallbackUsers();
      } finally {
        setIsLoading(false);
      }
    } else {
      loadFallbackUsers();
      setIsLoading(false);
    }
  };

  const loadFallbackUsers = () => {
    const stored = localStorage.getItem("road_registered_users");
    let localList: ProfileUser[] = [];
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        localList = parsed.map((p: any) => ({
          id: p.id || p.email,
          name: p.name || "Mock User",
          email: p.email || "",
          phone: p.phone || "",
          role: p.role || "buyer",
          isProfileComplete: p.isProfileComplete !== false,
          isVerified: !!p.isVerified
        }));
      } catch (e) {}
    }

    // Default mock list if local storage is empty
    const defaultMocks: ProfileUser[] = [
      { id: "1", name: "Aasrith Admin", email: "admin@road.facing", phone: "+91 9999999999", role: "admin", isProfileComplete: true, isVerified: true },
      { id: "2", name: "Vikram Malhotra", email: "vikram@example.com", phone: "+91 9876543210", role: "agent", isProfileComplete: true, isVerified: false },
      { id: "3", name: "Priya Mehta", email: "priya@gmail.com", phone: "+91 8888888888", role: "owner", isProfileComplete: true, isVerified: true },
      { id: "4", name: "Rahul Gupta", email: "rahul@outlook.com", phone: "", role: "buyer", isProfileComplete: false, isVerified: false }
    ];

    // Combine local registrations with default mocks, avoiding duplicates by email
    const combined = [...localList];
    defaultMocks.forEach(m => {
      if (!combined.some(c => c.email.toLowerCase() === m.email.toLowerCase())) {
        combined.push(m);
      }
    });

    setUsers(combined);
    // Write back to mock sync
    localStorage.setItem("road_registered_users", JSON.stringify(combined));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleVerifyUser = async (userId: string, email: string) => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .update({ is_verified: true })
          .eq("id", userId)
          .select();
          
        if (error) throw error;
        
        if (!data || data.length === 0) {
          toast.error("Verify operation completed, but 0 database rows were updated.", {
            description: "This is blocked by Supabase Row-Level Security (RLS). Please ensure you have added the 'Admins can update all profiles' update policy to your profiles table.",
            duration: 9000
          });
          fetchUsers();
          return;
        }
        
        toast.success("User verification approved!");
        
        // Push a storage sync trigger for other tabs
        try {
          const matchedEmail = users.find(u => u.id === userId)?.email;
          if (matchedEmail) {
            const activeUser = localStorage.getItem("road_user");
            if (activeUser) {
              const active = JSON.parse(activeUser);
              if (active.email === matchedEmail) {
                active.isVerified = true;
                localStorage.setItem("road_user", JSON.stringify(active));
              }
            }
          }
        } catch (e) {}

        fetchUsers();
      } catch (err: any) {
        console.error("Supabase verification failed:", err);
        toast.error(err.message || "Failed to verify user.");
      }
    } else {
      // Local Mock update
      const stored = localStorage.getItem("road_registered_users");
      if (stored) {
        try {
          const registered = JSON.parse(stored);
          const idx = registered.findIndex((r: any) => (r.id === userId || r.email === email));
          if (idx >= 0) {
            registered[idx].isVerified = true;
            localStorage.setItem("road_registered_users", JSON.stringify(registered));
            
            // Also sync active user session if this is the logged in user
            const activeUser = localStorage.getItem("road_user");
            if (activeUser) {
              const active = JSON.parse(activeUser);
              if (active.email === email) {
                active.isVerified = true;
                localStorage.setItem("road_user", JSON.stringify(active));
              }
            }

            toast.success("User verification approved! (Mock DB updated)");
            loadFallbackUsers();
          }
        } catch(e) {}
      }
    }
  };

  const handleRevokeUser = async (userId: string, email: string) => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .update({ is_verified: false })
          .eq("id", userId)
          .select();
          
        if (error) throw error;
        
        if (!data || data.length === 0) {
          toast.error("Revoke operation completed, but 0 database rows were updated.", {
            description: "This is blocked by Supabase Row-Level Security (RLS). Please ensure you have added the 'Admins can update all profiles' update policy to your profiles table.",
            duration: 9000
          });
          fetchUsers();
          return;
        }
        
        toast.info("User verification revoked.");
        
        // Push a storage sync trigger for other tabs
        try {
          const matchedEmail = users.find(u => u.id === userId)?.email;
          if (matchedEmail) {
            const activeUser = localStorage.getItem("road_user");
            if (activeUser) {
              const active = JSON.parse(activeUser);
              if (active.email === matchedEmail) {
                active.isVerified = false;
                localStorage.setItem("road_user", JSON.stringify(active));
              }
            }
          }
        } catch (e) {}

        fetchUsers();
      } catch (err: any) {
        console.error("Supabase revoke failed:", err);
        toast.error(err.message || "Failed to revoke user.");
      }
    } else {
      // Local Mock update
      const stored = localStorage.getItem("road_registered_users");
      if (stored) {
        try {
          const registered = JSON.parse(stored);
          const idx = registered.findIndex((r: any) => (r.id === userId || r.email === email));
          if (idx >= 0) {
            registered[idx].isVerified = false;
            localStorage.setItem("road_registered_users", JSON.stringify(registered));
            
            // Also sync active user session
            const activeUser = localStorage.getItem("road_user");
            if (activeUser) {
              const active = JSON.parse(activeUser);
              if (active.email === email) {
                active.isVerified = false;
                localStorage.setItem("road_user", JSON.stringify(active));
              }
            }

            toast.info("User verification revoked. (Mock DB updated)");
            loadFallbackUsers();
          }
        } catch(e) {}
      }
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
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                            {profile.name}
                            {profile.role === "admin" && (
                              <span className="text-[0.625rem] bg-purple-500/15 text-purple-400 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                                Staff
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-text-tertiary flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-text-tertiary" /> {profile.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          {profile.role === "admin" ? (
                            <ShieldAlert className="w-4 h-4 text-purple-400" />
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
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[0.68rem] font-bold bg-error-muted text-error border border-error/15 uppercase tracking-wide">
                          Setup Incomplete
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
                      ) : profile.isProfileComplete ? (
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
                          onClick={() => handleVerifyUser(profile.id, profile.email)}
                          disabled={!profile.isProfileComplete}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Verify User
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-lg text-xs text-error hover:bg-error/10 hover:text-error gap-1"
                          onClick={() => handleRevokeUser(profile.id, profile.email)}
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
          )}
        </div>
      </div>
    </div>
  );
}
