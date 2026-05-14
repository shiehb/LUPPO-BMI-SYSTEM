"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X, Check } from "lucide-react";
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
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  addRank, updateRank, deleteRank,
  addUnit, updateUnit, deleteUnit,
} from "./actions";
import type { RankEntry, UnitEntry } from "./actions";

// ── ManageList ────────────────────────────────────────────────────────────────

type Entry = { id: string; name: string };
type AddFn     = (name: string) => Promise<{ error?: string }>;
type UpdateFn  = (id: string, name: string) => Promise<{ error?: string }>;
type DeleteFn  = (id: string) => Promise<{ error?: string }>;

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

  // New-item state
  const [showAddRow, setShowAddRow] = useState(false);
  const [newName, setNewName]       = useState("");
  const [isAdding, setIsAdding]     = useState(false);

  // Inline edit state
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editValue, setEditValue]   = useState("");
  const [isSaving, setIsSaving]     = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [isDeleting, setIsDeleting]     = useState(false);

  // ── Handlers ──

  async function handleAdd() {
    if (!newName.trim()) return;
    setIsAdding(true);
    const result = await onAdd(newName.trim());
    setIsAdding(false);
    if (result.error) { toast.error(result.error); return; }
    const tempId = crypto.randomUUID();
    setItems((prev) => [...prev, { id: tempId, name: newName.trim() }]);
    setNewName("");
    setShowAddRow(false);
    toast.success(`"${newName.trim().toUpperCase()}" added.`);
  }

  function startEdit(item: Entry) {
    setEditingId(item.id);
    setEditValue(item.name);
  }

  async function handleSave(id: string) {
    if (!editValue.trim()) return;
    setIsSaving(true);
    const result = await onUpdate(id, editValue.trim());
    setIsSaving(false);
    if (result.error) { toast.error(result.error); return; }
    setItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, name: editValue.trim() } : item)
    );
    setEditingId(null);
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
        <CardContent className="pt-0">
          {/* Add row */}
          {showAddRow && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b">
              <Input
                autoFocus
                placeholder="Enter name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value.toUpperCase())}
                className="uppercase h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
                  if (e.key === "Escape") { setShowAddRow(false); setNewName(""); }
                }}
              />
              <Button size="sm" onClick={handleAdd} disabled={isAdding || !newName.trim()} className="h-8">
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

          {/* Items list */}
          <div className="divide-y max-h-72 overflow-y-auto">
            {items.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No entries yet. Add one above.
              </p>
            )}
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 py-2">
                {editingId === item.id ? (
                  <>
                    <Input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                      className="uppercase h-7 text-sm flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleSave(item.id); }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <Button size="sm" onClick={() => handleSave(item.id)} disabled={isSaving} className="h-7 px-2">
                      {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 px-2">
                      <X className="size-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm uppercase font-medium">{item.name}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${item.name}`}
                      onClick={() => { startEdit(item); setShowAddRow(false); }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => setDeleteTarget(item)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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

// ── SettingsView (root client component for this page) ────────────────────────

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
