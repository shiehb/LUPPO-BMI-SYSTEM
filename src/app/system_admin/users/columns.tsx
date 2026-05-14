"use client";

import { useState } from "react";
import type { ColumnDef, Row, Table } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { UserFormDialog } from "./UserFormDialog";
import { archiveUser } from "./actions";
import type { Profile, Role } from "@/lib/types";

interface TableMeta {
  onRefresh: () => void;
  onArchived?: () => void;
}

const ROLE_STYLES: Record<Role, string> = {
  system_admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  user: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const ROLE_LABELS: Record<Role, string> = {
  system_admin: "System Admin",
  admin: "Admin",
  user: "User",
};

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[role] ?? ROLE_STYLES.user}`}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function RowActions({ row, table }: { row: Row<Profile>; table: Table<Profile> }) {
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const profile = row.original;
  const meta = table.options.meta as TableMeta;

  async function handleArchive() {
    setIsArchiving(true);
    const result = await archiveUser(profile.id);
    setIsArchiving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(`${profile.full_name} has been moved to archives.`);
    setArchiveOpen(false);
    meta.onRefresh();
    meta.onArchived?.();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Open row actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setArchiveOpen(true)}
          >
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initialData={profile}
        onSuccess={() => {
          setEditOpen(false);
          meta.onRefresh();
        }}
      />

      <ConfirmationDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive Officer?"
        description={`${profile.full_name} will no longer be able to log in. This action is reversible but requires Admin override.`}
        confirmLabel="Archive"
        variant="destructive"
        isPending={isArchiving}
        onConfirm={handleArchive}
      />
    </>
  );
}

export const columns: ColumnDef<Profile>[] = [
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
    accessorKey: "rank",
    header: "Rank",
    cell: ({ row }) => (
      <span className="text-sm uppercase font-medium">
        {row.original.rank ?? "—"}
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
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <RoleBadge role={row.original.role} />,
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row, table }) => <RowActions row={row} table={table} />,
  },
];
