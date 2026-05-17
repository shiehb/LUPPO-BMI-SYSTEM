import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import UserReportUI from "./UserReportUI";
import type { Assessment } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function UserReportPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params  = await searchParams;
  const now     = new Date();
  const year    = Math.max(2023, Number(params.year)  || now.getFullYear());
  const month   = params.month ? Math.min(12, Math.max(1, Number(params.month))) : null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, rank")
    .eq("id", user.id)
    .single();

  /* Fetch all non-draft assessments for the selected year, scoped to session user */
  let query = supabase
    .from("bmi_assessments")
    .select("*")
    .eq("user_id", user.id)
    .gte("date_taken", `${year}-01-01`)
    .lte("date_taken", `${year}-12-31`)
    .neq("status", "draft")
    .order("date_taken", { ascending: false });

  const { data: allForYear } = await query;
  const assessments = (allForYear ?? []) as Assessment[];

  /* Months that have at least one assessment (1-based) */
  const availableMonths = Array.from(
    new Set(
      assessments.map((a) => new Date(`${a.date_taken}T00:00:00`).getMonth() + 1)
    )
  ).sort((a, b) => a - b);

  /* Selected assessment — filter to the chosen month when one is set */
  const selected: Assessment | null = month
    ? (assessments.find(
        (a) => new Date(`${a.date_taken}T00:00:00`).getMonth() + 1 === month
      ) ?? null)
    : null;

  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <UserReportUI
        assessments={assessments}
        availableMonths={availableMonths}
        selected={selected}
        year={year}
        month={month}
        name={profile?.full_name ?? ""}
        rank={profile?.rank ?? null}
      />
    </Suspense>
  );
}
