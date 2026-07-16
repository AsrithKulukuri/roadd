"use client";

import { Building, Heart, MessageSquare, Eye, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyCard } from "@/components/property/property-card";
import { getRecentProperties } from "@/lib/mock-data";

export default function DashboardPage() {
  const recentProperties = getRecentProperties(3);

  const stats = [
    { title: "Total Views", value: "12,450", icon: Eye, trend: "+12.5%" },
    { title: "Active Listings", value: "8", icon: Building, trend: "+2" },
    { title: "Saved Properties", value: "24", icon: Heart, trend: "+4" },
    { title: "New Leads", value: "15", icon: Users, trend: "+5.2%" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="font-heading text-3xl font-bold text-text-primary">Dashboard Overview</h1>
        <p className="text-text-secondary mt-1">Welcome back, Vikram. Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="bg-bg-card border-border-default">
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

      {/* Recent Activity & Quick Actions */}
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
  );
}
