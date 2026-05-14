"use client";

import { usePersonnelStore } from "@/store/personnelStore";
import { computeQuickStats } from "@/lib/utils/filter";
import { Users, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export function QuickStats() {
  const records = usePersonnelStore((s) => s.records);
  const { total, complianceRate, pending, obese } = computeQuickStats(records);

  const stats = [
    {
      label: "Total Personnel",
      value: total,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Compliance Rate",
      value: `${complianceRate}%`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: "Total Pending",
      value: pending,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
    {
      label: "Obese (PNP Standard)",
      value: obese,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, color, bg, border }) => (
        <div
          key={label}
          className={`flex items-center gap-3 rounded-xl border ${border} ${bg} px-4 py-3`}
        >
          <div className={`rounded-lg bg-white p-2 shadow-sm`}>
            <Icon className={`size-4 ${color}`} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold leading-tight ${color}`}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
