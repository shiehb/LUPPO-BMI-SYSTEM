import { create } from "zustand";
import type { PersonnelRecord, PersonnelStatus } from "@/lib/types";

type StatusFilter = PersonnelStatus | "all";

interface PersonnelStoreState {
  statusFilter: StatusFilter;
  searchQuery: string;
  records: PersonnelRecord[];

  setStatusFilter: (filter: StatusFilter) => void;
  setSearchQuery: (query: string) => void;
  initRecords: (records: PersonnelRecord[]) => void;
  optimisticallyApprove: (assessmentId: string) => void;
  optimisticallyReturn: (assessmentId: string, reason: string) => void;
}

export const usePersonnelStore = create<PersonnelStoreState>((set) => ({
  statusFilter: "all",
  searchQuery: "",
  records: [],

  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  initRecords: (records) => set({ records }),

  optimisticallyApprove: (assessmentId) =>
    set((s) => ({
      records: s.records.map((r) => {
        if (r.assessment?.id !== assessmentId) return r;
        return {
          ...r,
          status: "approved" as PersonnelStatus,
          assessment: r.assessment
            ? { ...r.assessment, status: "approved" as const, reviewed_at: new Date().toISOString() }
            : null,
        };
      }),
    })),

  optimisticallyReturn: (assessmentId, reason) =>
    set((s) => ({
      records: s.records.map((r) => {
        if (r.assessment?.id !== assessmentId) return r;
        return {
          ...r,
          status: "returned" as PersonnelStatus,
          assessment: r.assessment
            ? {
                ...r.assessment,
                status: "returned" as const,
                rejection_reason: reason,
                reviewed_at: new Date().toISOString(),
              }
            : null,
        };
      }),
    })),
}));
