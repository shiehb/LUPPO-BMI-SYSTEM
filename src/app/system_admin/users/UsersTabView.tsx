"use client";

import { useCallback, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserTable } from "./UserTable";
import { ArchivedTable } from "./ArchivedTable";

/**
 * Tabs wrapper for the Users management page.
 *
 * Cross-tab refresh: incrementing a version key forces the opposite table to
 * remount and re-fetch, so archiving a user immediately shows up in Archives
 * and restoring shows up in Active — even though both tables are always mounted
 * by Radix Tabs.
 */
export function UsersTabView() {
  const [activeKey, setActiveKey]   = useState(0);
  const [archiveKey, setArchiveKey] = useState(0);

  const refreshActive  = useCallback(() => setActiveKey((k)  => k + 1), []);
  const refreshArchive = useCallback(() => setArchiveKey((k) => k + 1), []);

  return (
    <Tabs defaultValue="active" className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Manage Users</h1>
        <TabsList>
          <TabsTrigger value="active">Active Users</TabsTrigger>
          <TabsTrigger value="archived">Archived Accounts</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="active" className="mt-0">
        <UserTable key={activeKey} onArchived={refreshArchive} />
      </TabsContent>

      <TabsContent value="archived" className="mt-0">
        <ArchivedTable key={archiveKey} onRestored={refreshActive} />
      </TabsContent>
    </Tabs>
  );
}
