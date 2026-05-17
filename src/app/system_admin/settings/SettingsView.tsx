"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  addRank, updateRank, deleteRank,
  addUnit, updateUnit, deleteUnit,
} from "./actions";
import type { RankEntry, UnitEntry } from "./actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Entry    = { id: string; name: string };
type AddFn    = (name: string) => Promise<{ error?: string }>;
type UpdateFn = (id: string, name: string) => Promise<{ error?: string }>;
type DeleteFn = (id: string) => Promise<{ error?: string }>;

interface TableMeta {
  editingId:      string | null;
  editValue:      string;
  setEditValue:   (v: string) => void;
  isSaving:       boolean;
  startEdit:      (item: Entry) => void;
  cancelEdit:     () => void;
  requestSave:    (id: string) => void;
  setDeleteTarget:(item: Entry) => void;
}

// ── Column definitions (shared by both tables via meta) ───────────────────────

const COLUMNS: ColumnDef<Entry>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row, table }) => {
      const meta = table.options.meta as TableMeta;
      if (meta.editingId === row.original.id) {
        return (
          <Input
            autoFocus
            value={meta.editValue}
            onChange={(e) => meta.setEditValue(e.target.value.toUpperCase())}
            className="uppercase h-7 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); meta.requestSave(row.original.id); }
              if (e.key === "Escape") meta.cancelEdit();
            }}
          />
        );
      }
      return (
        <span className="text-sm uppercase font-medium">{row.original.name}</span>
      );
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TableMeta;
      if (meta.editingId === row.original.id) {
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              onClick={() => meta.requestSave(row.original.id)}
              disabled={meta.isSaving}
              className="h-7 px-2"
            >
              {meta.isSaving
                ? <Loader2 className="size-3 animate-spin" />
                : <Check className="size-3" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={meta.cancelEdit} className="h-7 px-2">
              <X className="size-3" />
            </Button>
          </div>
        );
      }
      return (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${row.original.name}`}
            onClick={() => meta.startEdit(row.original)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${row.original.name}`}
            onClick={() => meta.setDeleteTarget(row.original)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      );
    },
  },
];

// ── ManageList ─────────────────────────────────────────────────────────────────

function ManageList({
  title,
  description,
  initialItems,
  onAdd,
  onUpdate,
  onDelete,
}: {
  title: string;
  description: string;
  initialItems: Entry[];
  onAdd: AddFn;
  onUpdate: UpdateFn;
  onDelete: DeleteFn;
}) {
  const [items, setItems] = useState<Entry[]>(initialItems);

  // Add state
  const [showAddRow, setShowAddRow]     = useState(false);
  const [newName, setNewName]           = useState("");
  const [isAdding, setIsAdding]         = useState(false);
  const [addConfirmOpen, setAddConfirmOpen] = useState(false);

  // Edit state
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editValue, setEditValue]       = useState("");
  const [isSaving, setIsSaving]         = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [pendingEditId, setPendingEditId]     = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [isDeleting, setIsDeleting]     = useState(false);

  // Filter state
  const [globalFilter, setGlobalFilter] = useState("");

  // ── Handlers ──

  async function handleAdd() {
    if (!newName.trim()) return;
    setAddConfirmOpen(false);
    setIsAdding(true);
    const result = await onAdd(newName.trim());
    setIsAdding(false);
    if (result.error) { toast.error(result.error); return; }
    setItems((prev) => [...prev, { id: crypto.randomUUID(), name: newName.trim() }]);
    setNewName("");
    setShowAddRow(false);
    toast.success(`"${newName.trim().toUpperCase()}" added.`);
  }

  function startEdit(item: Entry) {
    setEditingId(item.id);
    setEditValue(item.name);
    setShowAddRow(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setPendingEditId(null);
  }

  function requestSave(id: string) {
    if (!editValue.trim()) return;
    setPendingEditId(id);
    setEditConfirmOpen(true);
  }

  async function handleSave() {
    if (!pendingEditId || !editValue.trim()) return;
    setEditConfirmOpen(false);
    setIsSaving(true);
    const result = await onUpdate(pendingEditId, editValue.trim());
    setIsSaving(false);
    if (result.error) { toast.error(result.error); return; }
    setItems((prev) =>
      prev.map((item) =>
        item.id === pendingEditId ? { ...item, name: editValue.trim() } : item
      )
    );
    setEditingId(null);
    setPendingEditId(null);
    toast.success("Updated.");
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await onDelete(deleteTarget.id);
    setIsDeleting(false);
    if (result.error) { toast.error(result.error); setDeleteTarget(null); return; }
    setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
    toast.success(`"${deleteTarget.name.toUpperCase()}" removed.`);
    setDeleteTarget(null);
  }

  // ── Table ──

  const table = useReactTable({
    data: items,
    columns: COLUMNS,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
    meta: {
      editingId,
      editValue,
      setEditValue,
      isSaving,
      startEdit,
      cancelEdit,
      requestSave,
      setDeleteTarget,
    } as TableMeta,
  });

  const { pageIndex } = table.getState().pagination;
  const totalPages    = table.getPageCount();
  const filteredCount = table.getFilteredRowModel().rows.length;
  const showPagination = filteredCount > table.getState().pagination.pageSize;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="mt-0.5">{description}</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5"
              onClick={() => { setShowAddRow(true); setEditingId(null); }}
              disabled={showAddRow}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Add row */}
          {showAddRow && (
            <div className="flex items-center gap-2 pb-3 border-b">
              <Input
                autoFocus
                placeholder="Enter name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value.toUpperCase())}
                className="uppercase h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); if (newName.trim()) setAddConfirmOpen(true); }
                  if (e.key === "Escape") { setShowAddRow(false); setNewName(""); }
                }}
              />
              <Button
                size="sm"
                onClick={() => { if (newName.trim()) setAddConfirmOpen(true); }}
                disabled={isAdding || !newName.trim()}
                className="h-8"
              >
                {isAdding ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowAddRow(false); setNewName(""); }}
                className="h-8"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          )}

          {/* Filter */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter…"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {globalFilter && (
              <button
                type="button"
                aria-label="Clear filter"
                onClick={() => setGlobalFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={header.column.id === "actions" ? "text-right" : ""}
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
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={COLUMNS.length}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      {items.length === 0
                        ? "No entries yet. Add one above."
                        : "No results match your filter."}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cell.column.id === "actions" ? "text-right" : ""}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination — only rendered when entries overflow one page */}
          {showPagination && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {filteredCount} {filteredCount !== 1 ? "entries" : "entry"}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="First page"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronsLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Previous page"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span className="px-1 whitespace-nowrap">
                  Page {pageIndex + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Next page"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Last page"
                  onClick={() => table.setPageIndex(totalPages - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronsRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add confirmation */}
      <ConfirmationDialog
        open={addConfirmOpen}
        onOpenChange={(open) => { if (!open) setAddConfirmOpen(false); }}
        title="Add Entry?"
        description={`"${newName.trim().toUpperCase()}" will be added to the list.`}
        confirmLabel="Add"
        isPending={isAdding}
        onConfirm={handleAdd}
      />

      {/* Edit confirmation */}
      <ConfirmationDialog
        open={editConfirmOpen}
        onOpenChange={(open) => { if (!open) { setEditConfirmOpen(false); setPendingEditId(null); } }}
        title="Save Changes?"
        description={`The entry will be updated to "${editValue.trim().toUpperCase()}".`}
        confirmLabel="Save"
        isPending={isSaving}
        onConfirm={handleSave}
      />

      {/* Delete confirmation */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Entry?"
        description={
          deleteTarget
            ? `"${deleteTarget.name.toUpperCase()}" will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        isPending={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  );
}

// ── SettingsView ───────────────────────────────────────────────────────────────

export function SettingsView({
  initialRanks,
  initialUnits,
}: {
  initialRanks: RankEntry[];
  initialUnits: UnitEntry[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ManageList
        title="Ranks"
        description="Manage officer rank abbreviations used across all forms."
        initialItems={initialRanks}
        onAdd={addRank}
        onUpdate={updateRank}
        onDelete={deleteRank}
      />
      <ManageList
        title="Units / Stations"
        description="Manage the list of units and stations officers can be assigned to."
        initialItems={initialUnits}
        onAdd={addUnit}
        onUpdate={updateUnit}
        onDelete={deleteUnit}
      />
    </div>
  );
}
