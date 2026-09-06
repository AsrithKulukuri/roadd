import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";

export interface SiteVisitSchedule {
  id: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  projectLocation: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  builderName?: string;
  builderPhone?: string;
  visitDate: string; // YYYY-MM-DD or readable formatted date
  timeSlot: string; // e.g. "11:30 AM"
  status: "scheduled" | "completed" | "cancelled";
  customerNotified: boolean;
  builderNotified: boolean;
  reminderSent: boolean;
  notes?: string;
  createdAt: string;
}

interface SchedulesStore {
  schedules: SiteVisitSchedule[];
  isLoading: boolean;
  tableMissing: boolean;
  sqlFix?: string;
  addSchedule: (schedule: Omit<SiteVisitSchedule, "id" | "createdAt" | "status" | "reminderSent"> & { id?: string }) => Promise<SiteVisitSchedule>;
  updateStatus: (id: string, status: "scheduled" | "completed" | "cancelled") => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  fetchSchedules: () => Promise<void>;
  getUpcomingCount: () => number;
  getTodayCount: () => number;
}

export const useSchedulesStore = create<SchedulesStore>()(
  persist(
    (set, get) => ({
      schedules: [],
      isLoading: false,
      tableMissing: false,
      sqlFix: undefined,

      fetchSchedules: async () => {
        set({ isLoading: true });

        // 1. Primary: Server-side Admin Schedules API (bypasses RLS, checks project_leads fallback, detects table missing)
        try {
          const res = await fetch("/api/admin/schedules", {
            cache: "no-store",
            headers: { Accept: "application/json" },
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.success && Array.isArray(data.schedules)) {
              set({
                schedules: data.schedules,
                tableMissing: Boolean(data.tableMissing),
                sqlFix: data.sqlFix,
                isLoading: false,
              });
              return;
            }
          }
        } catch (apiErr) {
          console.warn("[SchedulesStore] Admin API fetch skipped, trying direct Supabase fallback:", apiErr);
        }

        // 2. Fallback: Direct client Supabase query if table exists
        try {
          if (supabase) {
            const { data, error } = await supabase
              .from("project_site_visits")
              .select("*")
              .order("created_at", { ascending: false });

            if (!error && Array.isArray(data)) {
              const mapped: SiteVisitSchedule[] = data.map((d: any) => ({
                id: d.id,
                projectId: d.project_id || "",
                projectSlug: d.project_slug || "",
                projectName: d.project_name || "Tour",
                projectLocation: d.project_location || "",
                customerName: d.customer_name || "Customer",
                customerPhone: d.customer_phone || "",
                customerEmail: d.customer_email || undefined,
                builderName: d.builder_name || undefined,
                builderPhone: d.builder_phone || undefined,
                visitDate: d.visit_date,
                timeSlot: d.time_slot,
                status: d.status || "scheduled",
                customerNotified: Boolean(d.customer_notified),
                builderNotified: Boolean(d.builder_notified),
                reminderSent: Boolean(d.reminder_sent),
                notes: d.notes || undefined,
                createdAt: d.created_at || new Date().toISOString(),
              }));

              set({ schedules: mapped, isLoading: false, tableMissing: false });
              return;
            }
          }
        } catch (err) {
          console.warn("[SchedulesStore] Supabase direct query error:", err);
        }

        set({ isLoading: false });
      },

      addSchedule: async (item) => {
        const newRecord: SiteVisitSchedule = {
          ...item,
          id: item.id || `visit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          status: "scheduled",
          reminderSent: false,
          createdAt: new Date().toISOString(),
        };

        // 1. Optimistic state update (merges with existing)
        set((state) => {
          const filtered = state.schedules.filter((s) => s.id !== newRecord.id);
          return { schedules: [newRecord, ...filtered] };
        });

        // 2. Sync to Supabase if table exists
        try {
          if (supabase) {
            await supabase.from("project_site_visits").insert({
              id: newRecord.id,
              project_id: newRecord.projectId || null,
              project_slug: newRecord.projectSlug || null,
              project_name: newRecord.projectName,
              project_location: newRecord.projectLocation || null,
              customer_name: newRecord.customerName,
              customer_phone: newRecord.customerPhone,
              customer_email: newRecord.customerEmail || null,
              builder_name: newRecord.builderName || null,
              builder_phone: newRecord.builderPhone || null,
              visit_date: newRecord.visitDate,
              time_slot: newRecord.timeSlot,
              status: newRecord.status,
              customer_notified: newRecord.customerNotified,
              builder_notified: newRecord.builderNotified,
              reminder_sent: newRecord.reminderSent,
              notes: newRecord.notes || null,
              created_at: newRecord.createdAt,
            });
          }
        } catch (err) {
          console.warn("[SchedulesStore] Supabase direct insert skipped:", err);
        }

        return newRecord;
      },

      updateStatus: async (id, status) => {
        // Optimistic UI update
        set((state) => ({
          schedules: state.schedules.map((s) => (s.id === id ? { ...s, status } : s)),
        }));

        // 1. Try server Admin API
        try {
          const res = await fetch("/api/admin/schedules", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
          });
          if (res.ok) return;
        } catch (err) {
          console.warn("[SchedulesStore] Admin API status update error:", err);
        }

        // 2. Direct Supabase fallback
        try {
          if (supabase) {
            await supabase
              .from("project_site_visits")
              .update({ status })
              .eq("id", id);
          }
        } catch (err) {
          console.warn("[SchedulesStore] Supabase fallback status update error:", err);
        }
      },

      deleteSchedule: async (id) => {
        // Optimistic UI update
        set((state) => ({
          schedules: state.schedules.filter((s) => s.id !== id),
        }));

        // 1. Try server Admin API
        try {
          const res = await fetch(`/api/admin/schedules?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          if (res.ok) return;
        } catch (err) {
          console.warn("[SchedulesStore] Admin API delete error:", err);
        }

        // 2. Direct Supabase fallback
        try {
          if (supabase) {
            await supabase.from("project_site_visits").delete().eq("id", id);
          }
        } catch (err) {
          console.warn("[SchedulesStore] Supabase fallback delete error:", err);
        }
      },

      getUpcomingCount: () => {
        return get().schedules.filter((s) => s.status === "scheduled").length;
      },

      getTodayCount: () => {
        const todayStr = new Date().toDateString();
        return get().schedules.filter((s) => {
          if (s.status !== "scheduled") return false;
          try {
            return new Date(s.visitDate).toDateString() === todayStr;
          } catch {
            return false;
          }
        }).length;
      },
    }),
    {
      name: "road_schedules_storage",
    }
  )
);
