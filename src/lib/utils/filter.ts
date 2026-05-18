import type { PersonnelRecord, PersonnelStatus } from "@/lib/types";

export interface PersonnelFilterOptions {
  statusFilter: PersonnelStatus | "all";
  searchQuery: string;
  unitFilter?: string;
}

export function filterPersonnelRecords(
  records: PersonnelRecord[],
  { statusFilter, searchQuery, unitFilter }: PersonnelFilterOptions
): PersonnelRecord[] {
  let result = records;

  if (statusFilter !== "all") {
    result = result.filter((r) => r.status === statusFilter);
  }

  if (unitFilter && unitFilter !== "all") {
    result = result.filter((r) => r.profile.unit_station === unitFilter);
  }

  const q = searchQuery.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (r) =>
        r.profile.full_name.toLowerCase().includes(q) ||
        r.profile.badge_number.toLowerCase().includes(q) ||
        (r.profile.rank ?? "").toLowerCase().includes(q) ||
        (r.profile.unit_station ?? "").toLowerCase().includes(q)
    );
  }

  return result;
}

export function computeQuickStats(records: PersonnelRecord[]) {
  const total = records.length;
  const approved = records.filter((r) => r.status === "approved").length;
  const pending = records.filter((r) => r.status === "pending_approval").length;
  const obese = records.filter((r) => {
    const pnp = r.assessment?.bmi_pnp_status ?? "";
    return (
      pnp.toLowerCase().includes("obese") ||
      pnp.toLowerCase().includes("at risk (central obesity)")
    );
  }).length;

  const complianceRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  return { total, complianceRate, pending, obese };
}
