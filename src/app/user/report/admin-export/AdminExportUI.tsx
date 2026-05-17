"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Printer,
  Table2,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  RANK_ORDER,
  rankPriority,
  sortByRank,
  CSV_COLUMNS,
  type ExportRow,
} from "../export-types";

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

const BMI_STATUS_OPTIONS = ["Normal", "Overweight", "Obese"] as const;

/* ── HELPERS ──────────────────────────────────────────────────────────────── */

function rankBadgeClass(rank: string): string {
  const idx = RANK_ORDER.findIndex(
    (r) => r.toLowerCase() === rank.trim().toLowerCase()
  );
  if (idx === -1)  return "bg-slate-50   text-slate-400  border-slate-200";
  if (idx <= 1)    return "bg-indigo-100 text-indigo-800 border-indigo-300";
  if (idx <= 3)    return "bg-blue-50    text-blue-700   border-blue-200";
  if (idx === 4)   return "bg-sky-50     text-sky-700    border-sky-200";
  if (idx <= 7)    return "bg-violet-50  text-violet-700 border-violet-200";
  if (idx === 8)   return "bg-slate-100  text-slate-700  border-slate-300";
  if (idx === 9)   return "bg-slate-50   text-slate-600  border-slate-200";
  return                  "bg-white      text-slate-400  border-slate-200";
}

function getBmiStatus(row: ExportRow): string | null {
  if (row.bmiScore === null) return null;
  if (row.bmiScore < 25)    return "Normal";
  if (row.bmiScore < 30)    return "Overweight";
  return "Obese";
}

/* ── COLUMN DEFINITIONS ───────────────────────────────────────────────────── */

const columns: ColumnDef<ExportRow>[] = [
  {
    id: "index",
    header: "#",
    cell: ({ row }) => (
      <span className="font-mono text-slate-400">{row.index + 1}</span>
    ),
  },
  {
    accessorKey: "rank",
    header: "RANK",
    cell: ({ getValue }) => {
      const rank = getValue<string>();
      return rank ? (
        <span className={cn(
          "inline-flex items-center rounded border px-2 py-0.5 font-semibold",
          rankBadgeClass(rank)
        )}>
          {rank}
        </span>
      ) : <span className="text-slate-300">—</span>;
    },
  },
  {
    id: "name",
    header: "NAME",
    cell: ({ row }) => {
      const { lastName, firstName, middleName, qualifier } = row.original;
      const formatted = [
        lastName.toUpperCase(),
        firstName,
        middleName ? `${middleName.charAt(0).toUpperCase()}.` : "",
      ].filter(Boolean).join(", ");
      return (
        <span className="font-medium text-slate-800">
          {formatted}
          {qualifier && (
            <span className="ml-1 text-[10px] text-slate-400">{qualifier}</span>
          )}
        </span>
      );
    },
  },
  {
    accessorKey: "badgeNumber",
    header: "BADGE #",
    cell: ({ getValue }) => (
      <span className="font-mono text-slate-600">
        {getValue<string>() || "—"}
      </span>
    ),
  },
  {
    accessorKey: "unit",
    header: "UNIT",
    cell: ({ getValue }) => (
      <span className="text-slate-500">{getValue<string>() || "—"}</span>
    ),
  },
  {
    id: "ageSex",
    header: "AGE / SEX",
    cell: ({ row }) => {
      const { age, gender } = row.original;
      return (
        <span className="whitespace-nowrap text-slate-600">
          {age !== null ? `${age} yrs` : "—"} / {gender ? gender.charAt(0) : "—"}
        </span>
      );
    },
  },
  {
    id: "metrics",
    header: "METRICS",
    cell: ({ row }) => {
      const { bmiScore, heightM, weightKg, waistCm, wristCm, hipCm } = row.original;
      return bmiScore !== null ? (
        <span className="block whitespace-nowrap text-center font-mono">
          <span className="text-slate-700">
            {heightM?.toFixed(2) ?? "—"} / {weightKg ?? "—"} / {waistCm ?? "—"}
          </span>
          <span className="block text-[10px] text-slate-400">
            wrist {wristCm ?? "—"} · hip {hipCm ?? "—"}
          </span>
        </span>
      ) : (
        <span className="block text-center text-slate-300">No data</span>
      );
    },
  },
  {
    accessorKey: "bmiScore",
    header: "BMI",
    cell: ({ getValue }) => {
      const score = getValue<number | null>();
      return score !== null ? (
        <span className="font-mono font-semibold text-slate-700">{score.toFixed(2)}</span>
      ) : (
        <span className="font-normal text-slate-300">—</span>
      );
    },
  },
];

/* ── COMPONENT ────────────────────────────────────────────────────────────── */

export default function AdminExportUI() {
  const [year,           setYear]           = useState(String(CURRENT_YEAR));
  const [month,          setMonth]          = useState("all");
  const [unitFilter,     setUnitFilter]     = useState("all");
  const [bmiFilter,      setBmiFilter]      = useState("all");
  const [rows,           setRows]           = useState<ExportRow[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [fetchError,     setFetchError]     = useState<string | null>(null);
  const [alertOpen,      setAlertOpen]      = useState(false);
  const [pagination,     setPagination]     = useState<PaginationState>({
    pageIndex: 0,
    pageSize:  25,
  });

  /* ── Load preview whenever year/month changes ───────────────────────────── */
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
      const data: ExportRow[] = await res.json();
      setRows(sortByRank(data));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setRows([]);
    } finally {
      setPreviewLoading(false);
    }
  }, [year, month]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  /* Reset to page 0 when client-side filters change ──────────────────────── */
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [unitFilter, bmiFilter, year, month]);

  /* ── Derived data ─────────────────────────────────────────────────────── */
  const unitOptions = useMemo(
    () => [...new Set(rows.map((r) => r.unit).filter(Boolean))].sort(),
    [rows]
  );

  const displayedRows = useMemo(() => rows.filter((row) => {
    if (unitFilter !== "all" && row.unit !== unitFilter) return false;
    if (bmiFilter !== "all" && getBmiStatus(row) !== bmiFilter)  return false;
    return true;
  }), [rows, unitFilter, bmiFilter]);

  /* ── Filter change handlers ─────────────────────────────────────────────── */
  function handleYearChange(v: string) {
    setYear(v);
    setUnitFilter("all");
  }

  function handleMonthChange(v: string) {
    setMonth(v);
    setUnitFilter("all");
  }

  /* ── CSV download ─────────────────────────────────────────────────────── */
  function downloadCSV() {
    function escape(value: string | number | null | undefined): string {
      const s = String(value ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    }
    const header = CSV_COLUMNS.map((c) => escape(c.header)).join(",");
    const lines  = displayedRows.map((row) =>
      CSV_COLUMNS.map((col) => {
        const raw = row[col.field as keyof ExportRow];
        if (raw === null || raw === undefined || raw === "") return "";
        if (typeof raw === "number" && col.decimals !== undefined)
          return escape(raw.toFixed(col.decimals));
        return escape(String(raw));
      }).join(",")
    );
    const csv        = [header, ...lines].join("\r\n");
    const blob       = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url        = window.URL.createObjectURL(blob);
    const anchor     = document.createElement("a");
    const monthLabel = month === "all" ? "All_Months" : MONTH_NAMES[Number(month) - 1];
    anchor.href      = url;
    anchor.download  = `BMI_Report_${year}_${monthLabel}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }

  /* ── TanStack table instance ────────────────────────────────────────────── */
  const table = useReactTable({
    data:                  displayedRows,
    columns,
    state:                 { pagination },
    onPaginationChange:    setPagination,
    getCoreRowModel:       getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination:      false,
  });

  /* ── Alert dialog readable labels ──────────────────────────────────────── */
  const unitLabel  = unitFilter === "all" ? "All Units"   : unitFilter;
  const monthLabel = month      === "all" ? "All Months"  : MONTH_NAMES[Number(month) - 1];

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {/* ── HEADING GROUP ─────────────────────────────────────────────────── */}
      <div className="space-y-0.5">
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <p className="text-sm text-muted-foreground">
          View and export BMI assessment records for all personnel.
        </p>
      </div>

      {/* ── FILTER BAR ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-2 gap-3
                        tab:flex tab:flex-row tab:flex-nowrap tab:items-end tab:gap-3">

          {/* Year */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Year
            </label>
            <Select value={year} onValueChange={handleYearChange}>
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
            <Select value={month} onValueChange={handleMonthChange}>
              <SelectTrigger className="!h-[42px] w-full bg-white tab:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {MONTH_NAMES.map((mName, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{mName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit / Station */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Unit / Station
            </label>
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="!h-[42px] w-full bg-white tab:w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All units</SelectItem>
                {unitOptions.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* BMI Result */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              BMI Result
            </label>
            <Select value={bmiFilter} onValueChange={setBmiFilter}>
              <SelectTrigger className="!h-[42px] w-full bg-white tab:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {BMI_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate Report — full-width on mobile, auto on tablet+ */}
          <div className="col-span-2 tab:col-auto tab:ml-auto tab:shrink-0">
            <Button
              onClick={() => setAlertOpen(true)}
              disabled={displayedRows.length === 0 || previewLoading}
              className="!h-[42px] w-full gap-2 bg-[#1a3a8a] text-white hover:bg-[#142f73]
                         tab:w-auto tab:whitespace-nowrap"
            >
              <Printer className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </div>
      </div>

      {/* ── CONFIRMATION DIALOG ────────────────────────────────────────────── */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate BMI Report?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>You are about to compile a BMI report with the following filters:</p>
                <ul className="space-y-1 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-slate-700">
                  <li><span className="font-medium text-slate-500">Year:</span> {year}</li>
                  <li><span className="font-medium text-slate-500">Month:</span> {monthLabel}</li>
                  <li><span className="font-medium text-slate-500">Unit / Station:</span> {unitLabel}</li>
                  <li><span className="font-medium text-slate-500">BMI Status:</span> {bmiFilter === "all" ? "All statuses" : bmiFilter}</li>
                </ul>
                <p>Are you sure you want to proceed with compilation?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={downloadCSV}
              className="bg-[#1a3a8a] hover:bg-[#142f73]"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── DATA TABLE ────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

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

        {/* Empty — no API data */}
        {!previewLoading && !fetchError && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-20 text-center text-slate-400">
            <Table2 className="h-9 w-9 text-slate-200" />
            <p className="text-sm font-medium">No records found for this period.</p>
            <p className="text-xs">Try selecting a different year or month.</p>
          </div>
        )}

        {/* Empty — filters exclude everything */}
        {!previewLoading && !fetchError && rows.length > 0 && displayedRows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-20 text-center text-slate-400">
            <Table2 className="h-9 w-9 text-slate-200" />
            <p className="text-sm font-medium">No records match the current filters.</p>
            <p className="text-xs">Try adjusting the unit or BMI status filters.</p>
          </div>
        )}

        {/* Shadcn Data Table */}
        {!previewLoading && !fetchError && displayedRows.length > 0 && (
          <>
            <Table className="text-xs">
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow
                    key={hg.id}
                    className="border-b border-slate-100 bg-slate-50/60 hover:bg-slate-50/60"
                  >
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          "whitespace-nowrap px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400",
                          header.id === "index"   && "w-9 text-center",
                          header.id === "metrics" && "text-center",
                          header.id === "bmiScore" && "text-center",
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {table.getRowModel().rows.map((row, displayIdx) => {
                  const pageRows   = table.getRowModel().rows;
                  const prevRow    = displayIdx > 0 ? pageRows[displayIdx - 1] : null;
                  const tierChange = prevRow !== null
                    && rankPriority(prevRow.original.rank) !== rankPriority(row.original.rank);
                  const hasData    = row.original.bmiScore !== null;

                  return (
                    <React.Fragment key={row.id}>
                      {tierChange && (
                        <TableRow className="border-0 bg-slate-50/80 hover:bg-slate-50/80">
                          <TableCell colSpan={columns.length} className="h-px px-3 py-0">
                            <div className="h-px w-full bg-slate-200" />
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow
                        className={cn(
                          "transition-colors hover:bg-slate-50/70",
                          !hasData && "opacity-60"
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              "px-3 py-2",
                              cell.column.id === "index"    && "text-center",
                              cell.column.id === "metrics"  && "text-center",
                              cell.column.id === "bmiScore" && "text-center",
                              cell.column.id === "unit"     && "max-w-[120px] truncate",
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>

            {/* ── PAGINATION ────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3
                            border-t border-slate-100 px-5 py-3 text-xs text-slate-500">

              {/* Rows per page */}
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <Select
                  value={String(table.getState().pagination.pageSize)}
                  onValueChange={(v) => table.setPageSize(Number(v))}
                >
                  <SelectTrigger className="h-7 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50].map((size) => (
                      <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Page info + navigation */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {Math.max(1, table.getPageCount())}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
