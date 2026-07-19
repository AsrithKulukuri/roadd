"use client";

import { useMemo } from "react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from "recharts";
import { mockProperties } from "@/lib/mock-data";

const monthlyData = [
  { name: 'Jan', views: 4000, leads: 240 },
  { name: 'Feb', views: 3000, leads: 139 },
  { name: 'Mar', views: 2000, leads: 980 },
  { name: 'Apr', views: 2780, leads: 390 },
  { name: 'May', views: 1890, leads: 480 },
  { name: 'Jun', views: 2390, leads: 380 },
  { name: 'Jul', views: 3490, leads: 430 },
];

export function AnalyticsCharts() {
  const propertyTypesData = useMemo(() => {
    const counts: Record<string, number> = {};
    mockProperties.forEach(p => {
      counts[p.propertyType] = (counts[p.propertyType] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key.replace('-', ' ').toUpperCase(),
      count: counts[key]
    }));
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      {/* Traffic & Leads Area Chart */}
      <div className="bg-bg-card border border-border-default rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-text-primary mb-6">Traffic & Leads (6 Months)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="views" stroke="#f59e0b" fillOpacity={1} fill="url(#colorViews)" />
              <Area type="monotone" dataKey="leads" stroke="#10b981" fillOpacity={1} fill="url(#colorLeads)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Property Inventory Bar Chart */}
      <div className="bg-bg-card border border-border-default rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-text-primary mb-6">Inventory by Type</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={propertyTypesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{fill: 'rgba(255, 255, 255, 0.05)'}}
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
              />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
