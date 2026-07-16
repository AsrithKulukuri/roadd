"use client";

import { usePropertiesStore } from "@/stores/properties-store";
import { Building2, Eye, Heart, Users } from "lucide-react";
import { formatPriceCompact } from "@/lib/utils";

export default function AdminDashboardPage() {
  const properties = usePropertiesStore((state) => state.properties);

  const totalProperties = properties.length;
  const activeProperties = properties.filter((p) => p.status !== "sold").length;
  const soldProperties = properties.filter((p) => p.status === "sold").length;
  const featuredProperties = properties.filter((p) => p.isFeatured).length;

  const totalValue = properties
    .filter((p) => p.listingType === "sale" && p.status !== "sold")
    .reduce((acc, curr) => acc + curr.price, 0);

  const stats = [
    { label: "Total Properties", value: totalProperties, icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Active Listings", value: activeProperties, icon: Eye, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Featured Properties", value: featuredProperties, icon: Heart, color: "text-amber-primary", bg: "bg-amber-primary/10" },
    { label: "Sold Out", value: soldProperties, icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-heading text-text-primary">Dashboard Overview</h1>
        <p className="text-text-secondary mt-1">Welcome back, Admin. Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-bg-card border border-border-default rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-text-primary">{stat.value}</h3>
              <p className="text-text-secondary font-medium mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity & Portfolio Value */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-bg-card border border-border-default rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-bold font-heading text-text-primary mb-6">Recent Properties</h3>
          <div className="space-y-4">
            {properties.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-border-subtle bg-bg-primary/50 hover:bg-bg-primary transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-border-default overflow-hidden shrink-0">
                    <img src={p.images[0]?.url} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary line-clamp-1">{p.title}</h4>
                    <p className="text-sm text-text-secondary">{p.location.locality}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-text-primary">{formatPriceCompact(p.price)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.status === 'sold' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                    {p.status === 'sold' ? 'Sold' : 'Active'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-bg-card border border-border-default rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-bold font-heading text-text-primary mb-6">Portfolio Value</h3>
          <div className="flex flex-col items-center justify-center p-8 bg-amber-primary/5 rounded-2xl border border-amber-primary/20">
            <span className="text-sm text-text-secondary font-medium uppercase tracking-wider mb-2">Total Active Sales Value</span>
            <span className="text-4xl font-bold text-amber-primary font-heading">
              {formatPriceCompact(totalValue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
