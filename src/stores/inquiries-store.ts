import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface BuyerRequirement {
  id: string;
  name: string;
  phone: string;
  email?: string;
  purpose: "Buy" | "Rent" | "Invest" | "Commercial Lease";
  propertyType: string;
  location: string;
  budget: string;
  bhk?: string;
  timeline?: string;
  notes?: string;
  status: "new" | "contacted" | "closed";
  createdAt: string;
}

interface InquiriesStore {
  requirements: BuyerRequirement[];
  isLoading: boolean;
  addRequirement: (req: Omit<BuyerRequirement, "id" | "status" | "createdAt">) => Promise<BuyerRequirement>;
  updateStatus: (id: string, status: "new" | "contacted" | "closed") => void;
  deleteRequirement: (id: string) => void;
  getUnreadCount: () => number;
}

export const useInquiriesStore = create<InquiriesStore>()(
  persist(
    (set, get) => ({
      requirements: [
        {
          id: "req-1",
          name: "Suresh Kumar",
          phone: "9876543210",
          email: "suresh.k@gmail.com",
          purpose: "Buy",
          propertyType: "3 BHK Apartment",
          location: "Benz Circle, Vijayawada",
          budget: "₹75L - ₹1 Cr",
          bhk: "3 BHK",
          timeline: "Within 3 Months",
          notes: "Looking for east-facing flat with 2 car parking and clubhouse amenities.",
          status: "new",
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
        {
          id: "req-2",
          name: "Ramesh Varma",
          phone: "9123456789",
          purpose: "Buy",
          propertyType: "Luxury Villa",
          location: "Poranki, Vijayawada",
          budget: "₹1.5 Cr - ₹2.5 Cr",
          bhk: "4+ BHK",
          timeline: "Immediate",
          notes: "Gated community villa with private garden required.",
          status: "contacted",
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        },
      ],
      isLoading: false,

      addRequirement: async (reqData) => {
        const newReq: BuyerRequirement = {
          id: `req-${Date.now()}`,
          ...reqData,
          status: "new",
          createdAt: new Date().toISOString(),
        };

        // Try syncing to Supabase inquiries table if exists
        try {
          await supabase.from("inquiries").insert({
            name: reqData.name,
            phone: reqData.phone,
            email: reqData.email || null,
            message: `[Requirement] Purpose: ${reqData.purpose} | Type: ${reqData.propertyType} | Loc: ${reqData.location} | Budget: ${reqData.budget} | BHK: ${reqData.bhk || "N/A"} | Timeline: ${reqData.timeline || "N/A"} | Notes: ${reqData.notes || "None"}`,
            created_at: newReq.createdAt,
          });
        } catch (e) {
          // Fallback to local
        }

        set((state) => ({
          requirements: [newReq, ...state.requirements],
        }));

        return newReq;
      },

      updateStatus: (id, status) => {
        set((state) => ({
          requirements: state.requirements.map((r) =>
            r.id === id ? { ...r, status } : r
          ),
        }));
        toast.success(`Requirement marked as ${status}`);
      },

      deleteRequirement: (id) => {
        set((state) => ({
          requirements: state.requirements.filter((r) => r.id !== id),
        }));
        toast.success("Requirement removed");
      },

      getUnreadCount: () => {
        return get().requirements.filter((r) => r.status === "new").length;
      },
    }),
    {
      name: "roadfacing-buyer-requirements-store",
    }
  )
);
