"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  UserCheck, 
  UserX,
  Phone,
  Mail,
  Search,
  Building2,
  Home,
  Briefcase,
  HardHat,
  Sparkles,
  ChevronDown
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
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

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

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setUpdatingRoleId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "updateRole", role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`User role updated to ${newRole}`);
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      } else {
        toast.error(data.error || "Failed to update role");
      }
    } catch (err: any) {
      toast.error(err.message || "Role update failed");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const roleStats = useMemo(() => {
    return {
      all: users.length,
      buyer: users.filter((u) => u.role === "buyer").length,
      owner: users.filter((u) => u.role === "owner").length,
      agent: users.filter((u) => u.role === "agent").length,
      builder: users.filter((u) => u.role === "builder").length,
      admin: users.filter((u) => u.role === "admin").length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === "all" ? true : u.role === roleFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.phone.includes(query) ||
        u.role.toLowerCase().includes(query);
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-3 h-3 text-rose-400" /> Staff Admin
          </span>
        );
      case "owner":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Building2 className="w-3 h-3 text-amber-400" /> Property Owner
          </span>
        );
      case "agent":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Briefcase className="w-3 h-3 text-purple-400" /> Real Estate Agent
          </span>
        );
      case "builder":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <HardHat className="w-3 h-3 text-emerald-400" /> Builder / Dev
          </span>
        );
      case "buyer":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Home className="w-3 h-3 text-blue-400" /> Buyer / Tenant
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Portal User Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-text-primary tracking-tight">Users & Role Directory</h1>
          <p className="text-text-secondary mt-1 text-xs sm:text-sm">
            Manage authenticated users, real estate classifications (Buyers, Owners, Agents, Builders), and account verification.
          </p>
        </div>
        <Button onClick={fetchUsers} variant="outline" className="gap-2 shrink-0">
          Refresh List
        </Button>
      </div>

      {/* Role Filter Tabs & Search Bar */}
      <div className="space-y-3">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setRoleFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              roleFilter === "all" ? "bg-amber-500 text-slate-950 shadow-md" : "bg-bg-card border border-border-default text-text-secondary hover:text-white"
            }`}
          >
            All Users ({roleStats.all})
          </button>
          <button
            onClick={() => setRoleFilter("buyer")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              roleFilter === "buyer" ? "bg-blue-500 text-white shadow-md" : "bg-bg-card border border-border-default text-text-secondary hover:text-white"
            }`}
          >
            Buyers / Tenants ({roleStats.buyer})
          </button>
          <button
            onClick={() => setRoleFilter("owner")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              roleFilter === "owner" ? "bg-amber-500 text-slate-950 shadow-md" : "bg-bg-card border border-border-default text-text-secondary hover:text-white"
            }`}
          >
            Property Owners ({roleStats.owner})
          </button>
          <button
            onClick={() => setRoleFilter("agent")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              roleFilter === "agent" ? "bg-purple-500 text-white shadow-md" : "bg-bg-card border border-border-default text-text-secondary hover:text-white"
            }`}
          >
            Agents ({roleStats.agent})
          </button>
          <button
            onClick={() => setRoleFilter("builder")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              roleFilter === "builder" ? "bg-emerald-500 text-white shadow-md" : "bg-bg-card border border-border-default text-text-secondary hover:text-white"
            }`}
          >
            Builders ({roleStats.builder})
          </button>
          <button
            onClick={() => setRoleFilter("admin")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              roleFilter === "admin" ? "bg-rose-500 text-white shadow-md" : "bg-bg-card border border-border-default text-text-secondary hover:text-white"
            }`}
          >
            Staff Admins ({roleStats.admin})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, phone number, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-card border border-border-default rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-amber-primary"
          />
        </div>
      </div>

      {/* Users Table / Mobile Cards */}
      <div className="bg-bg-card border border-border-default rounded-3xl overflow-hidden shadow-elevated">
        {isLoading ? (
          <div className="p-12 text-center">
            <span className="w-8 h-8 rounded-full border-3 border-amber-primary border-t-transparent animate-spin inline-block" />
            <p className="text-xs text-text-tertiary mt-2">Loading user directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            <Users className="w-12 h-12 text-text-tertiary mx-auto mb-3 opacity-50" />
            No users match the selected role or search filter.
          </div>
        ) : (
          <>
            {/* Mobile View: User Cards */}
            <div className="block md:hidden divide-y divide-border-subtle">
              {filteredUsers.map((profile) => (
                <div key={profile.id} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-primary/10 flex items-center justify-center text-amber-primary shrink-0 font-bold font-heading">
                      {(profile.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-text-primary text-sm truncate">
                        {profile.name}
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
                    <div>
                      {getRoleBadge(profile.role)}
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

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-border-subtle">
                    {/* Role selector dropdown */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-text-tertiary uppercase font-semibold">Role:</span>
                      <select
                        value={profile.role}
                        disabled={updatingRoleId === profile.id || profile.role === "admin"}
                        onChange={(e) => handleUpdateRole(profile.id, e.target.value)}
                        className="bg-bg-primary border border-border-default rounded-lg px-2 py-1 text-xs text-text-primary font-semibold focus:border-amber-primary"
                      >
                        <option value="buyer">Buyer</option>
                        <option value="owner">Owner</option>
                        <option value="agent">Agent</option>
                        <option value="builder">Builder</option>
                      </select>
                    </div>

                    {profile.role === "admin" ? (
                      <span className="text-xs text-text-tertiary italic">Admin Override</span>
                    ) : !profile.isVerified ? (
                      <Button
                        size="sm"
                        variant="amber"
                        className="h-7 text-xs font-semibold gap-1"
                        onClick={() => handleVerifyUser(profile.id)}
                      >
                        <UserCheck className="w-3 h-3" /> Verify
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-error hover:bg-error/10 hover:text-error gap-1"
                        onClick={() => handleRevokeUser(profile.id)}
                      >
                        <UserX className="w-3 h-3" /> Revoke
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
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">Current Role</th>
                    <th className="px-6 py-4">Change Role</th>
                    <th className="px-6 py-4">Verification Status</th>
                    <th className="px-6 py-4 text-right">Approve Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredUsers.map((profile) => (
                    <tr key={profile.id} className="hover:bg-bg-primary/20 transition-colors">
                      {/* User Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-primary/10 flex items-center justify-center text-amber-primary shrink-0 font-bold font-heading">
                            {(profile.name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                              {profile.name}
                            </div>
                            <div className="text-xs text-text-tertiary flex items-center gap-2 mt-0.5">
                              {profile.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-text-tertiary" /> {profile.email}
                                </span>
                              )}
                              {profile.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-text-tertiary" /> {profile.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(profile.role)}
                      </td>

                      {/* Role Editor */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {profile.role === "admin" ? (
                          <span className="text-xs text-rose-400 font-semibold">Master Staff</span>
                        ) : (
                          <select
                            value={profile.role}
                            disabled={updatingRoleId === profile.id}
                            onChange={(e) => handleUpdateRole(profile.id, e.target.value)}
                            className="bg-bg-primary border border-border-default rounded-lg px-2.5 py-1 text-xs text-text-primary font-semibold focus:border-amber-primary cursor-pointer"
                          >
                            <option value="buyer">Buyer / Tenant</option>
                            <option value="owner">Property Owner</option>
                            <option value="agent">Real Estate Agent</option>
                            <option value="builder">Builder / Developer</option>
                          </select>
                        )}
                      </td>

                      {/* Verification Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {profile.isVerified ? (
                          <span className="flex items-center gap-1.5 text-xs text-success font-semibold">
                            <CheckCircle className="w-4 h-4 text-success" />
                            Verified Profile
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

                      {/* Actions */}
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
  );
}
