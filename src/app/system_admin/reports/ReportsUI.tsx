"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Printer, FileText, Users, CheckCircle2, ClipboardList } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PersonnelRecord, PersonnelStatus } from "@/lib/types";

/* ── CONSTANTS ────────────────────────────────────────────────────────────── */

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from(
  { length: CURRENT_YEAR - 2022 },
  (_, i) => CURRENT_YEAR - i
);

const MONTH_NAMES = [
  "January", "February", "March", "April",
  "May",     "June",     "July",  "August",
  "September", "October", "November", "December",
];

const STATUS_CONFIG: Record<
  PersonnelStatus,
  { label: string; className: string }
> = {
  approved:           { label: "Approved",       className: "bg-green-100  text-green-700  border-green-200"  },
  pending_approval:   { label: "Pending",         className: "bg-amber-100  text-amber-700  border-amber-200"  },
  returned:           { label: "Returned",        className: "bg-red-100    text-red-700    border-red-200"    },
  revision_required:  { label: "For Revision",    className: "bg-orange-100 text-orange-700 border-orange-200" },
  not_started:        { label: "Not Submitted",   className: "bg-gray-100   text-gray-500   border-gray-200"   },
};

const WHO_COLOR: Record<string, string> = {
  "Normal":                        "text-green-600",
  "Underweight":                   "text-blue-600",
  "Overweight":                    "text-yellow-600",
  "Obese Class I":                 "text-orange-600",
  "Obese Class II":                "text-red-600",
  "Obese Class III":               "text-red-800",
  "At Risk (Central Obesity)":     "text-red-700",
  "Acceptable BMI by Large Frame": "text-emerald-600",
  "Acceptable BMI by Age":         "text-teal-600",
};

/* ── PROPS ────────────────────────────────────────────────────────────────── */

interface Props {
  records: PersonnelRecord[];
  year: number;
  month: number;
}

/* ── COMPONENT ────────────────────────────────────────────────────────────── */

export default function ReportsUI({ records, year, month }: Props) {
  const router = useRouter();
  const [search, setSearch]                   = useState("");
  const [onlyWithAssessments, setOnlyWithAssessments] = useState(false);

  function navigate(y: number, m: number) {
    router.push(`/dashboard/sys-admin/reports?year=${y}&month=${m}`);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (onlyWithAssessments && !r.assessment) return false;
      if (!q) return true;
      return (
        r.profile.full_name.toLowerCase().includes(q) ||
        r.profile.badge_number.toLowerCase().includes(q) ||
        (r.profile.rank ?? "").toLowerCase().includes(q) ||
        (r.profile.unit_station ?? "").toLowerCase().includes(q)
      );
    });
  }, [records, search, onlyWithAssessments]);

  const withAssessment = records.filter((r) => r.assessment !== null).length;
  const approvedCount  = records.filter((r) => r.status === "approved").length;

  return (
    <div className="space-y-6">

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 pb-4 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800">BMI Reports</h1>
        <p className="text-sm text-muted-foreground">
          Select a year and month, search for personnel, then open the print form.
        </p>
      </div>

      {/* ── FILTER CONTROLS ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">

          {/* Year */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Year
            </label>
            <Select
              value={String(year)}
              onValueChange={(v) => navigate(Number(v), month)}
            >
              <SelectTrigger className="h-9 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Month
            </label>
            <Select
              value={String(month)}
              onValueChange={(v) => navigate(year, Number(v))}
            >
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="flex flex-1 flex-col gap-1.5 min-w-52">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Name, badge, rank, or unit…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
          </div>

          {/* Toggle: show only assessed */}
          <button
            type="button"
            onClick={() => setOnlyWithAssessments((v) => !v)}
            className={cn(
              "h-9 rounded-lg border px-3 text-xs font-semibold transition-colors",
              onlyWithAssessments
                ? "border-[#1a3a8a] bg-[#1a3a8a]/10 text-[#1a3a8a]"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            )}
          >
            {onlyWithAssessments ? "With Assessment ✓" : "Show All"}
          </button>
        </div>

        {/* Summary stats */}
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600">
              <span className="font-bold text-slate-800">{records.length}</span> personnel
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600">
              <span className="font-bold text-slate-800">{withAssessment}</span> with assessments
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-slate-600">
              <span className="font-bold text-green-700">{approvedCount}</span> approved
            </span>
          </div>
        </div>
      </div>

      {/* ── PERSONNEL TABLE ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <FileText className="h-10 w-10 text-slate-200" />
            <p className="text-sm font-medium text-slate-500">
              No records found for&nbsp;
              <span className="font-semibold">{MONTH_NAMES[month - 1]} {year}</span>.
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs text-[#1a3a8a] underline underline-offset-2"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Name
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Badge
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Unit / Office
                  </th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    BMI
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Classification
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Date Taken
                  </th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(({ profile, assessment, status }) => {
                  const sc = STATUS_CONFIG[status];
                  const dateTaken = assessment?.date_taken
                    ? new Date(`${assessment.date_taken}T00:00:00`).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" }
                      )
                    : null;

                  return (
                    <tr
                      key={profile.id}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      {/* Name */}
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">
                          {profile.rank && (
                            <span className="font-normal text-slate-500">
                              {profile.rank}{" "}
                            </span>
                          )}
                          {profile.full_name}
                        </p>
                      </td>

                      {/* Badge */}
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                        {profile.badge_number}
                      </td>

                      {/* Unit */}
                      <td className="max-w-[180px] truncate px-4 py-3.5 text-xs text-slate-600">
                        {profile.unit_station ?? "—"}
                      </td>

                      {/* BMI */}
                      <td className="px-4 py-3.5 text-center">
                        {assessment?.bmi_score ? (
                          <span className="font-mono font-semibold text-slate-800">
                            {Number(assessment.bmi_score).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* WHO Classification */}
                      <td className={cn(
                        "px-4 py-3.5 text-xs font-medium",
                        WHO_COLOR[assessment?.bmi_who_status ?? ""] ?? "text-slate-400"
                      )}>
                        {assessment?.bmi_who_status ?? "—"}
                      </td>

                      {/* Date Taken */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">
                        {dateTaken ?? "—"}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          sc.className
                        )}>
                          {sc.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-right">
                        {assessment ? (
                          <Link
                            href={`/print/bmi-form?id=${assessment.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a3a8a] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#142f73]"
                          >
                            <Printer className="h-3 w-3" />
                            Print Form
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-300">No assessment</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Row count footer */}
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
              Showing {filtered.length} of {records.length} personnel
              {search && ` · filtered by "${search}"`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
