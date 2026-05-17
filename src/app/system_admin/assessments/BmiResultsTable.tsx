"use client";

import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  ClipboardCheck,
  Eye,
  Loader2,
  PencilLine,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { usePersonnelStore } from "@/store/personnelStore";
import { filterPersonnelRecords } from "@/lib/utils/filter";
import { notifyPersonnel } from "../personnel/actions";
import { allowEditRequest } from "../assessments/actions";
import type { PersonnelRecord, PersonnelStatus } from "@/lib/types";

// ─── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PersonnelStatus, { label: string; className: string }> = {
  approved:         { label: "Approved",          className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  pending_approval: { label: "Pending",            className: "bg-amber-100 text-amber-800 border-amber-200" },
  returned:         { label: "Returned",            className: "bg-red-100 text-red-800 border-red-200" },
  revision_required:{ label: "Revision Required",  className: "bg-orange-100 text-orange-800 border-orange-200" },
  not_started:      { label: "Not Started",        className: "bg-gray-100 text-gray-600 border-gray-200" },
};

function StatusBadge({ status }: { status: PersonnelStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return <Badge variant="outline" className={className}>{label}</Badge>;
}

// ─── Month picker ──────────────────────────────────────────────────────────────

function formatMonthLabel(ym: string) {
  const [year, month] = ym.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}

function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [year, monthStr] = value.split("-");
  const month = parseInt(monthStr, 10);

  function shift(delta: number) {
    const d = new Date(parseInt(year, 10), month - 1 + delta, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="size-7" onClick={() => shift(-1)} aria-label="Previous month">
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-[140px] text-center text-sm font-medium">
        {formatMonthLabel(value)}
      </span>
      <Button variant="ghost" size="icon" className="size-7" onClick={() => shift(1)} aria-label="Next month">
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

// ─── Status filter tabs ────────────────────────────────────────────────────────

type StatusFilter = PersonnelStatus | "all";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all",              label: "All" },
  { value: "approved",         label: "Approved" },
  { value: "pending_approval", label: "Pending" },
  { value: "returned",         label: "Returned" },
  { value: "not_started",      label: "Not Started" },
];

// ─── Allow-edit button ────────────────────────────────────────────────────────

function AllowEditButton({ assessmentId }: { assessmentId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const { error } = await allowEditRequest(assessmentId);
      if (error) toast.error(`Allow edit failed: ${error}`);
      else toast.success("Edit access granted.");
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
          disabled={isPending}
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : <PencilLine className="size-3" />}
          Allow Edit
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Allow Edit Request</AlertDialogTitle>
          <AlertDialogDescription>
            This will unlock the assessment and return it to draft so the officer can make changes. The submission will need to be re-reviewed after resubmission.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Allow Edit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Action cell ───────────────────────────────────────────────────────────────

function ActionCell({
  row,
  month,
}: {
  row: PersonnelRecord;
  month: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // No assessment yet — offer an email reminder
  if (!row.assessment || row.status === "not_started") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const { error } = await notifyPersonnel(row.profile.id, month);
            if (error) toast.error(`Notify failed: ${error}`);
            else toast.success(`Reminder sent to ${row.profile.full_name}.`);
          });
        }}
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : <Bell className="size-3" />}
        Notify
      </Button>
    );
  }

  // Pending — navigate to full-page review + always expose Allow Edit
  if (row.status === "pending_approval") {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => router.push(`/dashboard/personnel/${row.assessment!.id}`)}
        >
          <ClipboardCheck className="size-3" />
          Review
        </Button>
        <AllowEditButton assessmentId={row.assessment!.id} />
      </div>
    );
  }

  // Already reviewed — navigate to full-page view (read-only)
  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 text-xs"
      onClick={() => router.push(`/dashboard/personnel/${row.assessment!.id}`)}
    >
      <Eye className="size-3" />
      Open
    </Button>
  );
}

// ─── Table columns ─────────────────────────────────────────────────────────────

function buildColumns(month: string): ColumnDef<PersonnelRecord>[] {
  return [
    {
      id: "officer",
      accessorFn: (r) => r.profile.full_name,
      header: "Officer",
      cell: ({ row }) => {
        const { rank, full_name } = row.original.profile;
        return (
          <div className="min-w-[180px]">
            <span className="font-medium text-sm uppercase">
              {rank ? `${rank} ` : ""}
              {full_name}
            </span>
          </div>
        );
      },
    },
    {
      id: "badge",
      accessorFn: (r) => r.profile.badge_number,
      header: "Badge #",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.profile.badge_number}</span>
      ),
    },
    {
      id: "unit",
      accessorFn: (r) => r.profile.unit_station ?? "",
      header: "Unit / Station",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.profile.unit_station ?? "—"}
        </span>
      ),
    },
    {
      id: "status",
      accessorFn: (r) => r.status,
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "bmi",
      accessorFn: (r) => r.assessment?.bmi_score ?? -1,
      header: "BMI",
      cell: ({ row }) =>
        row.original.assessment ? (
          <span className="tabular-nums text-sm font-semibold">
            {row.original.assessment.bmi_score.toFixed(2)}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: "pnp_status",
      accessorFn: (r) => r.assessment?.bmi_pnp_status ?? "",
      header: "PNP Classification",
      cell: ({ row }) =>
        row.original.assessment ? (
          <span className="text-xs">{row.original.assessment.bmi_pnp_status}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: "date_taken",
      accessorFn: (r) => r.assessment?.date_taken ?? "",
      header: "Date Taken",
      cell: ({ row }) =>
        row.original.assessment?.date_taken ? (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.assessment.date_taken).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ActionCell row={row.original} month={month} />
      ),
      enableSorting: false,
    },
  ];
}

// ─── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
  if (isSorted === "asc")  return <ChevronUp   className="ml-1 size-3.5 inline" />;
  if (isSorted === "desc") return <ChevronDown className="ml-1 size-3.5 inline" />;
  return <ChevronsUpDown className="ml-1 size-3.5 inline opacity-40" />;
}

// ─── Main component ────────────────────────────────────────────────────────────

interface BmiResultsTableProps {
  initialRecords: PersonnelRecord[];
  initialMonth: string;
}

export function BmiResultsTable({ initialRecords, initialMonth }: BmiResultsTableProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const { statusFilter, searchQuery, records, setStatusFilter, setSearchQuery, initRecords } =
    usePersonnelStore();

  const [sorting, setSorting]             = useState<SortingState>([]);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);

  useEffect(() => {
    initRecords(initialRecords);
  }, [initialRecords, initRecords]);

  const handleMonthChange = useCallback(
    (month: string) => {
      setSelectedMonth(month);
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", month);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const filtered = useMemo(
    () => filterPersonnelRecords(records, { statusFilter, searchQuery }),
    [records, statusFilter, searchQuery]
  );

  const columns = useMemo(
    () => buildColumns(selectedMonth),
    [selectedMonth]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  const pageCount   = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className="space-y-4">
        {/* Filters row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status tabs */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map(({ value, label }) => {
              const count =
                value === "all"
                  ? records.length
                  : records.filter((r) => r.status === value).length;
              const active = statusFilter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setStatusFilter(value); table.setPageIndex(0); }}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  {label}
                  <span
                    className={[
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      active ? "bg-white/20 text-inherit" : "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Month picker + search */}
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker value={selectedMonth} onChange={handleMonthChange} />
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name or badge…"
                className="pl-9 text-sm h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border bg-white">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <SortIcon isSorted={header.column.getIsSorted()} />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No records match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/40">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {pageCount} &middot;{" "}
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Select
                value={String(table.getState().pagination.pageSize)}
                onValueChange={(v) => table.setPageSize(Number(v))}
              >
                <SelectTrigger className="h-8 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-xs">
                      {n} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}
