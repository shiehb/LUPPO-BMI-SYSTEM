"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef, Row, Table } from "@tanstack/react-table";
import { CheckCircle, MoreHorizontal, XCircle } from "lucide-react";
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
import { archiveUser, approveUser, deleteUser } from "./actions";
import type { Profile, Role } from "@/lib/types";

interface TableMeta {
  onRefresh: () => void;
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

// ── Actions for pending (unapproved) rows ─────────────────────────────────────

function PendingRowActions({ profile, table }: { profile: Profile; table: Table<Profile> }) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const meta = table.options.meta as TableMeta;

  async function handleApprove() {
    setIsApproving(true);
    const result = await approveUser(profile.id);
    setIsApproving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(`${profile.full_name} has been approved and can now access the system.`);
    setApproveOpen(false);
    meta.onRefresh();
  }

  async function handleReject() {
    setIsRejecting(true);
    const result = await deleteUser(profile.id);
    setIsRejecting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(`${profile.full_name}'s registration has been rejected and deleted.`);
    setRejectOpen(false);
    meta.onRefresh();
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs text-green-700 border-green-200 hover:bg-green-50 hover:text-green-800"
          onClick={() => setApproveOpen(true)}
        >
          <CheckCircle className="size-3.5" />
          Approve
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs text-destructive border-destructive/20 hover:bg-destructive/10"
          onClick={() => setRejectOpen(true)}
        >
          <XCircle className="size-3.5" />
          Reject
        </Button>
      </div>

      <ConfirmationDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve Account?"
        description={`${profile.full_name} will be granted full access to the system.`}
        confirmLabel="Approve"
        isPending={isApproving}
        onConfirm={handleApprove}
      />

      <ConfirmationDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject & Delete Account?"
        description={`This will permanently delete ${profile.full_name}'s account and profile. This cannot be undone.`}
        confirmLabel="Delete Account"
        variant="destructive"
        isPending={isRejecting}
        onConfirm={handleReject}
      />
    </>
  );
}

// ── Actions for approved rows (existing 3-dot menu) ───────────────────────────

function ApprovedRowActions({ profile, table }: { profile: Profile; table: Table<Profile> }) {
  const router = useRouter();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

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
          <DropdownMenuItem onSelect={() => router.push(`/dashboard/sys-admin/users/${profile.id}/edit`)}>
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

// ── Dispatcher ────────────────────────────────────────────────────────────────

function RowActions({ row, table }: { row: Row<Profile>; table: Table<Profile> }) {
  const profile = row.original;
  if (!profile.is_approved) {
    return <PendingRowActions profile={profile} table={table} />;
  }
  return <ApprovedRowActions profile={profile} table={table} />;
}

// ── Column definitions ────────────────────────────────────────────────────────

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
