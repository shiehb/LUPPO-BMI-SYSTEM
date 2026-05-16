import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArchivedTable } from "../ArchivedTable";

export default function ArchivedAccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Archived Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Restore deactivated officer accounts or review archived records.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href="/system_admin/users">
            <ArrowLeft className="mr-2 size-4" />
            Back to Users
          </Link>
        </Button>
      </div>

      <ArchivedTable />
    </div>
  );
}
