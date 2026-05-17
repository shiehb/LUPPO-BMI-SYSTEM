"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Printer,
  CalendarDays,
  ClipboardX,
  FileText,
  Search,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Assessment } from "@/lib/types";

/* ── CONSTANTS ────────────────────────────────────────────────────────────── */

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2022 }, (_, i) => CURRENT_YEAR - i);

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_CONFIG = {
  approved:          { label: "Approved",       className: "bg-green-100  text-green-700  border-green-200"  },
  pending_approval:  { label: "Pending Review",  className: "bg-amber-100  text-amber-700  border-amber-200"  },
  returned:          { label: "Returned",        className: "bg-red-100    text-red-700    border-red-200"    },
  revision_required: { label: "Needs Revision",  className: "bg-orange-100 text-orange-700 border-orange-200" },
} as const;

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
  assessments:     Assessment[];
  availableMonths: number[];
  selected:        Assessment | null;
  year:            number;
  month:           number | null;
  name:            string;
  rank:            string | null;
}

/* ── ROOT COMPONENT ───────────────────────────────────────────────────────── */

export default function UserReportUI({
  assessments,
  availableMonths,
  selected,
  year,
  month,
  name,
  rank,
}: Props) {
  const router = useRouter();
  const [localYear,  setLocalYear]  = useState(String(year));
  const [localMonth, setLocalMonth] = useState(month ? String(month) : "");

  function generate() {
    const params = new URLSearchParams({ year: localYear });
    if (localMonth) params.set("month", localMonth);
    router.push(`/user/report?${params.toString()}`);
  }

  const monthsForLocalYear =
    String(localYear) === String(year) ? availableMonths : [];

  return (
    <div className="space-y-6">

      {/* ── PAGE HEADER ──────────────────────────────────────────────────────
          Left : report title + officer name
          Right: filter bar                                                 */}
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-5
                      desk:flex-row desk:items-end desk:justify-between desk:gap-8">

        {/* Title block */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My BMI Report</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {rank ? `${rank} ` : ""}{name}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            View and print your personal BMI assessments.
          </p>
        </div>

        {/* Filter bar */}
        <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-2 gap-3
                          tab:flex tab:flex-row tab:flex-nowrap tab:items-end tab:gap-3">

              {/* Year */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Year
                </label>
                <Select
                  value={localYear}
                  onValueChange={(v) => { setLocalYear(v); setLocalMonth(""); }}
                >
                  <SelectTrigger className="!h-[42px] w-full bg-white tab:w-[112px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Month
                </label>
                <Select value={localMonth} onValueChange={setLocalMonth}>
                  <SelectTrigger className="!h-[42px] w-full bg-white tab:w-[152px]">
                    <SelectValue placeholder="All months" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((mName, i) => {
                      const m = i + 1;
                      const hasData = monthsForLocalYear.includes(m);
                      return (
                        <SelectItem key={m} value={String(m)}>
                          <span className={cn(!hasData && localYear === String(year) && "text-slate-400")}>
                            {mName}
                          </span>
                          {hasData && (
                            <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-500 align-middle" />
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Generate — full-width on mobile, auto on tablet+ */}
              <div className="col-span-2 tab:col-auto tab:shrink-0">
                <Button
                  onClick={generate}
                  className="!h-[42px] w-full gap-2 bg-[#1a3a8a] text-white hover:bg-[#142f73]
                             tab:w-auto tab:whitespace-nowrap"
                >
                  <Search className="h-4 w-4" />
                  Generate Report
                </Button>
              </div>
          </div>
        </div>
      </div>

      {/* ── RESULTS ──────────────────────────────────────────────────────── */}
      {month ? (
        selected ? (
          <AssessmentCard assessment={selected} />
        ) : (
          <EmptyState year={year} month={month} />
        )
      ) : (
        assessments.length === 0 ? (
          <EmptyState year={year} month={null} />
        ) : (
          <div className="space-y-4">
            {assessments.map((a) => (
              <AssessmentCard key={a.id} assessment={a} />
            ))}
          </div>
        )
      )}
    </div>
  );
}

/* ── ASSESSMENT CARD ──────────────────────────────────────────────────────── */

function AssessmentCard({ assessment }: { assessment: Assessment }) {
  const [printConfirmOpen, setPrintConfirmOpen] = useState(false);

  const sc =
    STATUS_CONFIG[assessment.status as keyof typeof STATUS_CONFIG] ?? null;

  const date      = new Date(`${assessment.date_taken}T00:00:00`);
  const monthYear = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const dayFull   = date.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  const whoColor  = WHO_COLOR[assessment.bmi_who_status ?? ""] ?? "text-slate-700";
  const pnpColor  = WHO_COLOR[assessment.bmi_pnp_status ?? ""] ?? "text-slate-700";
  const printHref = `/print/bmi-form?id=${assessment.id}`;
  const hasNormalRange = assessment.normal_weight_min > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">

      {/* Card header */}
      <div className="mb-[18px] flex flex-col items-start gap-2.5 tab:flex-row tab:items-start tab:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="font-semibold text-slate-800">{monthYear}</span>
          <span className="text-xs text-slate-400">({dayFull})</span>
          {sc && (
            <span className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              sc.className
            )}>
              {sc.label}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setPrintConfirmOpen(true)}
          className="hidden shrink-0 items-center gap-2 rounded-lg bg-[#1a3a8a] px-4 py-2.5
                     text-sm font-semibold text-white shadow-sm transition hover:bg-[#142f73]
                     active:scale-95 tab:inline-flex"
        >
          <Printer className="h-4 w-4" />
          Print Form
        </button>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-4
                      tab:grid tab:grid-cols-[240px_1fr] tab:items-start tab:gap-5
                      desk:grid-cols-[280px_1fr] desk:gap-7">

        {/* Score + classification block */}
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50
                        tab:flex tab:h-full tab:flex-col">
          <div className="border-r border-slate-200 px-3.5 py-4
                          tab:flex-1 tab:border-r-0 tab:border-b tab:p-5 desk:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              BMI Score
            </p>
            <p className="mt-1.5 font-mono text-[30px] font-bold leading-none text-slate-800
                          tab:text-[34px] desk:text-[40px]">
              {Number(assessment.bmi_score).toFixed(2)}
            </p>
          </div>
          <div className="px-3.5 py-4 tab:flex-1 tab:p-5 desk:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Classification
            </p>
            <div className="mt-2 space-y-2.5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-300">
                  PNP Standard
                </p>
                <p className={cn("text-sm font-semibold leading-snug tab:text-[15px] desk:text-base", pnpColor)}>
                  {assessment.bmi_pnp_status ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-300">
                  WHO Standard
                </p>
                <p className={cn("text-sm font-semibold leading-snug tab:text-[15px] desk:text-base", whoColor)}>
                  {assessment.bmi_who_status ?? "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Measurement tiles */}
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2.5 desk:grid-cols-3 desk:gap-3">
            <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-3 desk:px-4 desk:py-3.5">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 desk:text-[11px]">Weight</p>
              <p className="text-[13px] font-semibold text-slate-800 desk:text-sm">{assessment.weight} kg</p>
            </div>
            <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-3 desk:px-4 desk:py-3.5">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 desk:text-[11px]">Height</p>
              <p className="text-[13px] font-semibold text-slate-800 desk:text-sm">
                {Number(assessment.height).toFixed(2)} m
              </p>
            </div>
            {assessment.waist && (
              <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-3 desk:px-4 desk:py-3.5">
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 desk:text-[11px]">Waist</p>
                <p className="text-[13px] font-semibold text-slate-800 desk:text-sm">{assessment.waist} cm</p>
              </div>
            )}
            {assessment.hip && (
              <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-3 desk:px-4 desk:py-3.5">
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 desk:text-[11px]">Hip</p>
                <p className="text-[13px] font-semibold text-slate-800 desk:text-sm">{assessment.hip} cm</p>
              </div>
            )}
            {assessment.wrist && (
              <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-3 desk:px-4 desk:py-3.5">
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 desk:text-[11px]">Wrist</p>
                <p className="text-[13px] font-semibold text-slate-800 desk:text-sm">{assessment.wrist} cm</p>
              </div>
            )}
          </div>

          {hasNormalRange && (
            <div className="flex items-center justify-between gap-2 rounded-[10px] border border-slate-200 bg-slate-100 px-3.5 py-2.5">
              <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 desk:text-[11px]">
                Normal Weight Range
              </p>
              <p className="font-mono text-[13px] font-semibold text-slate-600 desk:text-sm">
                {Number(assessment.normal_weight_min).toFixed(1)}
                {" – "}
                {Number(assessment.normal_weight_max).toFixed(1)} kg
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile print button */}
      <div className="mt-5 border-t border-slate-200 pt-4 tab:hidden">
        <button
          type="button"
          onClick={() => setPrintConfirmOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a3a8a]
                     px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition
                     hover:bg-[#142f73] active:scale-95"
        >
          <Printer className="h-4 w-4" />
          Print Form
        </button>
      </div>

      {/* Print confirmation dialog */}
      <AlertDialog open={printConfirmOpen} onOpenChange={setPrintConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Print BMI Form?</AlertDialogTitle>
            <AlertDialogDescription>
              This will open the BMI assessment form for{" "}
              <strong>{monthYear}</strong> in a new tab ready for printing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => window.open(printHref, "_blank", "noopener,noreferrer")}
            >
              Open &amp; Print
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── EMPTY STATE ──────────────────────────────────────────────────────────── */

function EmptyState({ year, month }: { year: number; month: number | null }) {
  const label = month ? `${MONTH_NAMES[month - 1]} ${year}` : String(year);
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border
                    border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <ClipboardX className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-slate-600">
          No assessments found for {label}
        </p>
        <p className="text-sm text-slate-400">
          Submitted BMI assessments for this period will appear here once processed.
        </p>
      </div>
      <Link
        href="/user/assessment"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white
                   px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
      >
        <FileText className="h-4 w-4" />
        Go to My Assessment
      </Link>
    </div>
  );
}
