"use client";

import { Users, Shield, ShieldAlert, ShieldCheck } from "lucide-react";

export default function AdminUsersPage() {
  const users = [
    { id: 1, name: "Admin User", email: "admin@road.com", role: "Super Admin", status: "Active" },
    { id: 2, name: "John Doe", email: "john@example.com", role: "Agent", status: "Active" },
    { id: 3, name: "Jane Smith", email: "jane@example.com", role: "User", status: "Inactive" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-heading text-text-primary">Users</h1>
        <p className="text-text-secondary mt-1">Manage platform administrators, agents, and users.</p>
      </div>

      <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text-secondary">
            <thead className="bg-bg-primary/50 text-text-primary border-b border-border-default uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-bg-primary/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-primary/10 flex items-center justify-center text-amber-primary shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-text-primary">{user.name}</div>
                        <div className="text-xs text-text-tertiary">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {user.role === "Super Admin" ? (
                        <ShieldAlert className="w-4 h-4 text-purple-500" />
                      ) : user.role === "Agent" ? (
                        <ShieldCheck className="w-4 h-4 text-amber-primary" />
                      ) : (
                        <Shield className="w-4 h-4 text-text-tertiary" />
                      )}
                      <span className="font-medium">{user.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.status === 'Inactive' 
                        ? 'bg-red-500/10 text-red-500' 
                        : 'bg-green-500/10 text-green-500'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="text-amber-primary hover:underline text-sm font-medium">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
