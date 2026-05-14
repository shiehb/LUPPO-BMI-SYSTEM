"use client";

import { useState } from "react";
import type { ColumnDef, Row, Table } from "@tanstack/react-table";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { restoreUser } from "./actions";
import type { Profile } from "@/lib/types";

interface TableMeta {
  onRefresh: () => void;
  onRestored?: () => void;
}

function ArchivedRowActions({
  row,
  table,
}: {
  row: Row<Profile>;
  table: Table<Profile>;
}) {
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const profile = row.original;
  const meta = table.options.meta as TableMeta;

  async function handleRestore() {
    setIsRestoring(true);
    const result = await restoreUser(profile.id);
    setIsRestoring(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(`${profile.full_name} has been restored.`);
    setRestoreOpen(false);
    meta.onRefresh();
    meta.onRestored?.();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setRestoreOpen(true)}
        className="gap-1.5"
      >
        <RotateCcw className="size-3.5" />
        Restore
      </Button>

      <ConfirmationDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        title="Restore User?"
        description="This officer will regain access to the system."
        confirmLabel="Restore"
        isPending={isRestoring}
        onConfirm={handleRestore}
      />
    </>
  );
}

export const archivedColumns: ColumnDef<Profile>[] = [
  {
    accessorKey: "badge_number",
    header: "Badge #",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">
        {row.original.badge_number}
      </span>
    ),
  },
  {
    accessorKey: "full_name",
    header: "Full Name",
    cell: ({ row }) => (
      <span className="font-medium uppercase">{row.original.full_name}</span>
    ),
  },
  {
    accessorKey: "unit_station",
    header: "Unit / Station",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.unit_station ?? "—"}</span>
    ),
  },
  {
    accessorKey: "archived_at",
    header: "Date Archived",
    cell: ({ row }) => {
      const v = row.original.archived_at;
      if (!v) return <span className="text-muted-foreground text-sm">—</span>;
      return (
        <span className="text-sm">
          {new Date(v).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row, table }) => <ArchivedRowActions row={row} table={table} />,
  },
];
