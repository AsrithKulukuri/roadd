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
  addSchedule: (schedule: Omit<SiteVisitSchedule, "id" | "createdAt" | "status" | "reminderSent">) => Promise<SiteVisitSchedule>;
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

      fetchSchedules: async () => {
        set({ isLoading: true });
        try {
          if (supabase) {
            const { data, error } = await supabase
              .from("project_site_visits")
              .select("*")
              .order("created_at", { ascending: false });

            if (!error && data && data.length > 0) {
              const mapped: SiteVisitSchedule[] = data.map((d: any) => ({
                id: d.id,
                projectId: d.project_id,
                projectSlug: d.project_slug,
                projectName: d.project_name,
                projectLocation: d.project_location || "",
                customerName: d.customer_name,
                customerPhone: d.customer_phone,
                customerEmail: d.customer_email,
                builderName: d.builder_name,
                builderPhone: d.builder_phone,
                visitDate: d.visit_date,
                timeSlot: d.time_slot,
                status: d.status || "scheduled",
                customerNotified: Boolean(d.customer_notified),
                builderNotified: Boolean(d.builder_notified),
                reminderSent: Boolean(d.reminder_sent),
                notes: d.notes,
                createdAt: d.created_at,
              }));

              set({ schedules: mapped, isLoading: false });
              return;
            }
          }
        } catch (err) {
          console.warn("[SchedulesStore] fetch failed, using local store:", err);
        }
        set({ isLoading: false });
      },

      addSchedule: async (item) => {
        const newRecord: SiteVisitSchedule = {
          ...item,
          id: `visit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          status: "scheduled",
          reminderSent: false,
          createdAt: new Date().toISOString(),
        };

        // 1. Optimistic state update
        set((state) => ({
          schedules: [newRecord, ...state.schedules],
        }));

        // 2. Sync to Supabase if table exists
        try {
          if (supabase) {
            await supabase.from("project_site_visits").insert({
              id: newRecord.id,
              project_id: newRecord.projectId,
              project_slug: newRecord.projectSlug,
              project_name: newRecord.projectName,
              project_location: newRecord.projectLocation,
              customer_name: newRecord.customerName,
              customer_phone: newRecord.customerPhone,
              customer_email: newRecord.customerEmail,
              builder_name: newRecord.builderName,
              builder_phone: newRecord.builderPhone,
              visit_date: newRecord.visitDate,
              time_slot: newRecord.timeSlot,
              status: newRecord.status,
              customer_notified: newRecord.customerNotified,
              builder_notified: newRecord.builderNotified,
              reminder_sent: newRecord.reminderSent,
              notes: newRecord.notes,
              created_at: newRecord.createdAt,
            });
          }
        } catch (err) {
          console.warn("[SchedulesStore] Supabase insert skipped:", err);
        }

        return newRecord;
      },

      updateStatus: async (id, status) => {
        set((state) => ({
          schedules: state.schedules.map((s) => (s.id === id ? { ...s, status } : s)),
        }));

        try {
          if (supabase) {
            await supabase
              .from("project_site_visits")
              .update({ status })
              .eq("id", id);
          }
        } catch (err) {
          console.warn("[SchedulesStore] status update error:", err);
        }
      },

      deleteSchedule: async (id) => {
        set((state) => ({
          schedules: state.schedules.filter((s) => s.id !== id),
        }));

        try {
          if (supabase) {
            await supabase.from("project_site_visits").delete().eq("id", id);
          }
        } catch (err) {
          console.warn("[SchedulesStore] delete error:", err);
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
