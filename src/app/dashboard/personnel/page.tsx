import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getPersonnelRecords } from "@/app/system_admin/personnel/actions";
import { BmiResultsTable } from "@/app/system_admin/assessments/BmiResultsTable";
import { AssessmentWindowControl } from "@/app/system_admin/assessments/AssessmentWindowControl";
import { Skeleton } from "@/components/ui/skeleton";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function PersonnelPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const month  = params.month ?? currentMonth();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const canEditWindow = profile?.role === "system_admin";

  const records = await getPersonnelRecords(month);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">BMI Results</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            BMI assessment compliance overview and review for all active personnel.
          </p>
        </div>

        <AssessmentWindowControl canEditWindow={canEditWindow} />
      </div>

      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <BmiResultsTable initialRecords={records} initialMonth={month} />
      </Suspense>
    </div>
  );
}
