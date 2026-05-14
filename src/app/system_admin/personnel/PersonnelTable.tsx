"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import {
  Check,
  X,
  Bell,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { usePersonnelStore } from "@/store/personnelStore";
import { filterPersonnelRecords } from "@/lib/utils/filter";
import { updateAssessmentStatus, notifyPersonnel } from "./actions";
import { RejectionDialog } from "./RejectionDialog";
import type { PersonnelRecord, PersonnelStatus } from "@/lib/types";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PersonnelStatus,
  { label: string; className: string }
> = {
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  pending_approval: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  not_started: {
    label: "Not Started",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

function StatusBadge({ status }: { status: PersonnelStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

// ─── Month picker ─────────────────────────────────────────────────────────────

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
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    onChange(`${y}-${m}`);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => shift(-1)}
        aria-label="Previous month"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-[140px] text-center text-sm font-medium">
        {formatMonthLabel(value)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => shift(1)}
        aria-label="Next month"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

// ─── Status tabs ──────────────────────────────────────────────────────────────

type StatusFilter = PersonnelStatus | "all";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "pending_approval", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "not_started", label: "Not Started" },
];

// ─── Action cell ─────────────────────────────────────────────────────────────

function ActionCell({ row, month }: { row: PersonnelRecord; month: string }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const optimisticallyApprove = usePersonnelStore((s) => s.optimisticallyApprove);

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
        {isPending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Bell className="size-3" />
        )}
        Notify
      </Button>
    );
  }

  if (row.status === "pending_approval") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
          disabled={isPending}
          onClick={() => {
            optimisticallyApprove(row.assessment!.id);
            startTransition(async () => {
              const { error } = await updateAssessmentStatus(
                row.assessment!.id,
                "approved"
              );
              if (error) toast.error(`Approval failed: ${error}`);
              else toast.success(`${row.profile.full_name}'s assessment approved.`);
            });
          }}
        >
          {isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Check className="size-3" />
          )}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-xs text-red-700 border-red-300 hover:bg-red-50"
          disabled={isPending}
          onClick={() => setRejectOpen(true)}
        >
          <X className="size-3" />
          Reject
        </Button>
        <RejectionDialog
          assessmentId={row.assessment.id}
          officerName={row.profile.full_name}
          open={rejectOpen}
          onOpenChange={setRejectOpen}
        />
      </div>
    );
  }

  return null;
}

// ─── Table columns ────────────────────────────────────────────────────────────

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
            {new Date(row.original.assessment.date_taken).toLocaleDateString(
              "en-PH",
              { year: "numeric", month: "short", day: "numeric" }
            )}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <ActionCell row={row.original} month={month} />,
      enableSorting: false,
    },
  ];
}

// ─── Sorting icon ─────────────────────────────────────────────────────────────

function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
  if (isSorted === "asc") return <ChevronUp className="ml-1 size-3.5 inline" />;
  if (isSorted === "desc") return <ChevronDown className="ml-1 size-3.5 inline" />;
  return <ChevronsUpDown className="ml-1 size-3.5 inline opacity-40" />;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PersonnelTableProps {
  initialRecords: PersonnelRecord[];
  initialMonth: string;
}

export function PersonnelTable({ initialRecords, initialMonth }: PersonnelTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { statusFilter, searchQuery, records, setStatusFilter, setSearchQuery, initRecords } =
    usePersonnelStore();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);

  // Init store once (and on server refresh)
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

  const filtered = filterPersonnelRecords(records, { statusFilter, searchQuery });

  const columns = buildColumns(selectedMonth);

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

  const pageCount = table.getPageCount();
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
                onClick={() => setStatusFilter(value)}
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

        {/* Right controls */}
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
