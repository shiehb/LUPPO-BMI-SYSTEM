import Link from "next/link";
import { Archive, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserTable } from "./UserTable";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add, update, and manage officer accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/system_admin/users/archive">
              <Archive className="mr-2 size-4" />
              Archived Accounts
            </Link>
          </Button>
          <Button asChild className="shrink-0">
            <Link href="/system_admin/users/add">
              <Plus className="mr-2 size-4" />
              New User
            </Link>
          </Button>
        </div>
      </div>

      <UserTable />
    </div>
  );
}
