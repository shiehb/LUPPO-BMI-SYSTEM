import { Suspense } from "react";
import { getPersonnelRecords } from "./actions";
import { PersonnelTable } from "./PersonnelTable";
import { QuickStats } from "./QuickStats";
import { Skeleton } from "@/components/ui/skeleton";

function currentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function PersonnelMasterListPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const month = params.month ?? currentMonth();

  const records = await getPersonnelRecords(month);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Personnel Master List</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          BMI assessment compliance overview for all active personnel.
        </p>
      </div>

      {/* Quick stats reads from Zustand — hydrated by PersonnelTable below */}
      <Suspense fallback={<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>}>
        <QuickStats />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <PersonnelTable initialRecords={records} initialMonth={month} />
      </Suspense>
    </div>
  );
}
