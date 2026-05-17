"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Loader2, Database, Table2, Users, ClipboardList } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { RANK_ORDER, rankPriority, sortByRank, type ExportRow } from "./export-types";

/* ── CONSTANTS ────────────────────────────────────────────────────────────── */

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from(
  { length: Math.max(2, CURRENT_YEAR - 2023) },
  (_, i) => CURRENT_YEAR - i
);

const MONTH_NAMES = [
  "January", "February", "March",    "April",
  "May",     "June",     "July",     "August",
  "September","October", "November", "December",
];

/* ── RANK BADGE COLOUR MAP ────────────────────────────────────────────────── */
// Descending visual weight mirrors descending rank weight.

function rankBadgeClass(rank: string): string {
  const idx = RANK_ORDER.findIndex(
    (r) => r.toLowerCase() === rank.trim().toLowerCase()
  );
  if (idx === -1)  return "bg-slate-50   text-slate-400  border-slate-200";   // unknown
  if (idx <= 1)    return "bg-indigo-100 text-indigo-800 border-indigo-300";  // PCOL, PLTCOL
  if (idx <= 3)    return "bg-blue-50    text-blue-700   border-blue-200";    // PMAJ, PCPT
  if (idx === 4)   return "bg-sky-50     text-sky-700    border-sky-200";     // PLT
  if (idx <= 7)    return "bg-violet-50  text-violet-700 border-violet-200";  // PEMS, PCMS, PMSg, SSg
  if (idx === 8)   return "bg-slate-100  text-slate-700  border-slate-300";   // Cpl
  if (idx === 9)   return "bg-slate-50   text-slate-600  border-slate-200";   // Pat
  return                  "bg-white      text-slate-400  border-slate-200";   // NUP
}

/* ── COMPONENT ────────────────────────────────────────────────────────────── */

export default function AdminExportPanel() {
  const [year,           setYear]           = useState(String(CURRENT_YEAR));
  const [month,          setMonth]          = useState("all");
  const [rows,           setRows]           = useState<ExportRow[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloading,    setDownloading]    = useState(false);
  const [fetchError,     setFetchError]     = useState<string | null>(null);

  /* ── Load preview whenever filters change ─────────────────────────────── */
  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({ year, format: "json" });
      if (month !== "all") params.set("month", month);

      const res = await fetch(`/api/admin/export-all-bmi-csv?${params}`);
      if (!res.ok) {
        throw new Error(
          res.status === 403 ? "Access denied." : "Failed to load preview data."
        );
      }
      // API already returns rows sorted by rank; apply the same sort client-side
      // so the preview is authoritative even if the response ever arrives out of order.
      const data: ExportRow[] = await res.json();
      setRows(sortByRank(data));
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setRows([]);
    } finally {
      setPreviewLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  /* ── CSV download (fetch → Blob → anchor trigger) ─────────────────────── */
  async function handleDownload() {
    setDownloading(true);
    try {
      const params = new URLSearchParams({ year });
      if (month !== "all") params.set("month", month);

      // responseType: "blob" equivalent using the Fetch API
      const res = await fetch(`/api/admin/export-all-bmi-csv?${params}`);
      if (!res.ok) throw new Error("Server returned an error.");

      const blob       = await res.blob();
      const objectUrl  = window.URL.createObjectURL(blob);
      const anchor     = document.createElement("a");
      const monthLabel = month === "all"
        ? "All_Months"
        : MONTH_NAMES[Number(month) - 1];

      anchor.href     = objectUrl;
      anchor.download = `Master_BMI_Export_${year}_${monthLabel}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      alert("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  /* ── Derived stats ────────────────────────────────────────────────────── */
  const withAssessment    = rows.filter((r) => r.bmiScore !== null).length;
  const withoutAssessment = rows.length - withAssessment;

  /* ── Rank tier label for the legend ──────────────────────────────────── */
  const rankGroups: { label: string; ranks: string[] }[] = [
    { label: "Senior Officers",        ranks: ["PCOL", "PLTCOL"]              },
    { label: "Officers",               ranks: ["PMAJ", "PCPT", "PLT"]         },
    { label: "Senior NCOs",            ranks: ["PEMS", "PCMS", "PMSg", "SSg"] },
    { label: "Junior Ranks / Civilian",ranks: ["Cpl", "Pat", "NUP"]           },
  ];

  return (
    <div className="space-y-5">

      {/* ── Engine Control Panel ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

        {/* Header */}
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50">
            <Database className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">
              System Bulk Export Engine
            </h2>
            <p className="text-xs text-slate-500">
              Records are sorted{" "}
              <span className="font-semibold text-slate-700">
                highest → lowest rank
              </span>{" "}
              (PCOL → NUP), then alphabetically by last name.
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4">

          {/* Assessment Year */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Assessment Year
            </label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-9 w-28 bg-white">
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

          {/* Assessment Month */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Assessment Month
            </label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-9 w-44 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {MONTH_NAMES.map((mName, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {mName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || previewLoading || rows.length === 0}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-colors",
              downloading || previewLoading || rows.length === 0
                ? "cursor-not-allowed bg-emerald-300"
                : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
            )}
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Compiling File…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Generate &amp; Download CSV
              </>
            )}
          </button>
        </div>

        {/* Summary stats + rank legend */}
        {!previewLoading && !fetchError && rows.length > 0 && (
          <div className="mt-4 space-y-3">

            {/* Counts */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">
                  <span className="font-bold text-slate-800">{rows.length}</span> personnel
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <ClipboardList className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">
                  <span className="font-bold text-slate-800">{withAssessment}</span> with BMI data
                </span>
              </div>
              {withoutAssessment > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-sm text-slate-500">
                    <span className="font-bold">{withoutAssessment}</span> no submission
                  </span>
                </div>
              )}
            </div>

            {/* Rank tier legend */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Rank tiers:
              </span>
              {rankGroups.map((g) => (
                <div key={g.label} className="flex items-center gap-1">
                  {g.ranks.map((r) => (
                    <span
                      key={r}
                      className={cn(
                        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                        rankBadgeClass(r)
                      )}
                    >
                      {r}
                    </span>
                  ))}
                  <span className="ml-0.5 text-[10px] text-slate-400">{g.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Export Preview Table ───────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        {/* Table toolbar */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
          <Table2 className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Export Preview — sorted by Rank (highest → lowest)
          </span>
          {!previewLoading && !fetchError && (
            <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {rows.length} rows
            </span>
          )}
        </div>

        {/* Loading */}
        {previewLoading && (
          <div className="flex items-center justify-center gap-2.5 py-20 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading records…</span>
          </div>
        )}

        {/* Error */}
        {!previewLoading && fetchError && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm font-medium text-red-600">{fetchError}</p>
            <button
              type="button"
              onClick={loadPreview}
              className="text-xs text-[#1a3a8a] underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!previewLoading && !fetchError && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-20 text-center text-slate-400">
            <Table2 className="h-9 w-9 text-slate-200" />
            <p className="text-sm font-medium">No records found for this period.</p>
            <p className="text-xs">Try selecting a different year or month.</p>
          </div>
        )}

        {/* Data table */}
        {!previewLoading && !fetchError && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                  <th className="w-9 px-3 py-3 text-center font-semibold uppercase tracking-wider text-slate-400">
                    #
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold uppercase tracking-wider text-slate-400">
                    Rank
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold uppercase tracking-wider text-slate-400">
                    Name (Last, First M.)
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold uppercase tracking-wider text-slate-400">
                    Badge #
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold uppercase tracking-wider text-slate-400">
                    Unit
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold uppercase tracking-wider text-slate-400">
                    Age / Sex
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-semibold uppercase tracking-wider text-slate-400">
                    Metrics (H / W / Waist)
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-semibold uppercase tracking-wider text-slate-400">
                    BMI
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold uppercase tracking-wider text-slate-400">
                    Wt. to Lose
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {rows.map((row, idx) => {
                  const hasData = row.bmiScore !== null;
                  // Group separator: insert a subtle divider when rank tier changes
                  const prevRank   = idx > 0 ? rows[idx - 1].rank : null;
                  const tierChange = prevRank !== null
                    && rankPriority(prevRank) !== rankPriority(row.rank);

                  return (
                    <>
                      {/* Tier separator row */}
                      {tierChange && (
                        <tr key={`sep-${idx}`} className="bg-slate-50/80">
                          <td
                            colSpan={9}
                            className="h-px px-3 py-0"
                          >
                            <div className="h-px w-full bg-slate-200" />
                          </td>
                        </tr>
                      )}

                      <tr
                        key={row.badgeNumber || idx}
                        className={cn(
                          "transition-colors hover:bg-slate-50/70",
                          !hasData && "opacity-60"
                        )}
                      >
                        {/* Row # */}
                        <td className="px-3 py-2 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Rank badge */}
                        <td className="px-3 py-2">
                          {row.rank ? (
                            <span
                              className={cn(
                                "inline-flex items-center rounded border px-2 py-0.5 font-semibold",
                                rankBadgeClass(row.rank)
                              )}
                            >
                              {row.rank}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Name: Last, First MI. */}
                        <td className="px-3 py-2 font-medium text-slate-800">
                          {[
                            row.lastName.toUpperCase(),
                            row.firstName,
                            row.middleName ? `${row.middleName.charAt(0).toUpperCase()}.` : "",
                          ]
                            .filter(Boolean)
                            .join(", ")}
                          {row.qualifier && (
                            <span className="ml-1 text-[10px] text-slate-400">
                              {row.qualifier}
                            </span>
                          )}
                        </td>

                        {/* Badge # */}
                        <td className="px-3 py-2 font-mono text-slate-600">
                          {row.badgeNumber || "—"}
                        </td>

                        {/* Unit */}
                        <td className="max-w-[120px] truncate px-3 py-2 text-slate-500">
                          {row.unit || "—"}
                        </td>

                        {/* Age / Sex */}
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {row.age !== null ? `${row.age} yrs` : "—"}
                          {" / "}
                          {row.gender ? row.gender.charAt(0) : "—"}
                        </td>

                        {/* Metrics: H(m) / W(kg) / Waist — Wrist / Hip sub-line */}
                        <td className="whitespace-nowrap px-3 py-2 text-center font-mono">
                          {hasData ? (
                            <>
                              <span className="text-slate-700">
                                {row.heightM?.toFixed(2) ?? "—"}
                                {" / "}
                                {row.weightKg ?? "—"}
                                {" / "}
                                {row.waistCm ?? "—"}
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                wrist {row.wristCm ?? "—"} · hip {row.hipCm ?? "—"}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-300">No data</span>
                          )}
                        </td>

                        {/* BMI */}
                        <td className="px-3 py-2 text-center font-mono font-semibold text-slate-700">
                          {row.bmiScore !== null
                            ? row.bmiScore.toFixed(2)
                            : <span className="font-normal text-slate-300">—</span>}
                        </td>

                        {/* Weight to lose */}
                        <td className="px-3 py-2 text-slate-600">
                          {row.weightToLose !== null
                            ? row.weightToLose === 0
                              ? <span className="text-green-600 font-semibold">Normal</span>
                              : `${row.weightToLose.toFixed(2)} kg`
                            : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    </>
                  );
                })}
              </tbody>
            </table>

            {/* Footer */}
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
              {rows.length} personnel ·{" "}
              {month === "all"
                ? `Full year ${year}`
                : `${MONTH_NAMES[Number(month) - 1]} ${year}`}{" "}
              · Sorted PCOL → NUP
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
