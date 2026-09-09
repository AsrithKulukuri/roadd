import { create } from "zustand";
import { persist } from "zustand/middleware";

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

        try {
          const res = await fetch(typeof window !== "undefined" && window.location.pathname.startsWith("/builder") ? "/api/builder/schedules" : "/api/admin/schedules", {
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
          console.warn("[SchedulesStore] Admin schedules fetch failed:", apiErr);
        }

        set({ isLoading: false, schedules: [] });
        throw new Error("Could not load schedules. Please retry.");
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

        return newRecord;
      },

      updateStatus: async (id, status) => {
        const previousSchedules = get().schedules;

        // Optimistic UI update
        set((state) => ({
          schedules: state.schedules.map((s) => (s.id === id ? { ...s, status } : s)),
        }));

        // 1. Try server Admin API
        try {
          const res = await fetch(typeof window !== "undefined" && window.location.pathname.startsWith("/builder") ? "/api/builder/schedules" : "/api/admin/schedules", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
          });
          if (res.ok) return;
        } catch (err) {
          console.warn("[SchedulesStore] Admin API status update error:", err);
        }

        set({ schedules: previousSchedules });
        throw new Error("Admin schedule status update failed.");
      },

      deleteSchedule: async (id) => {
        const previousSchedules = get().schedules;

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

        set({ schedules: previousSchedules });
        throw new Error("Admin schedule delete failed.");
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
      version: 2, partialize: () => ({}), migrate: () => ({}), merge: (_stored, current) => current,
    }
  )
);
