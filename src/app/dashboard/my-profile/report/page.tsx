import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Assessment, Profile } from "@/lib/types";
import UserReportUI from "@/app/user/report/UserReportUI";

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function MyReportPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { year: yearParam, month: monthParam } = await searchParams;
  const year  = yearParam  ? parseInt(yearParam,  10) : new Date().getFullYear();
  const month = monthParam ? parseInt(monthParam, 10) : null;

  const [profileResult, assessmentsResult] = await Promise.all([
    supabase.from("profiles").select("full_name, rank").eq("id", user.id).single(),
    supabase
      .from("bmi_assessments")
      .select("*")
      .eq("user_id", user.id)
      .gte("date_taken", `${year}-01-01`)
      .lte("date_taken", `${year}-12-31`)
      .order("date_taken", { ascending: false }),
  ]);

  const profile     = profileResult.data as Pick<Profile, "full_name" | "rank"> | null;
  const assessments = (assessmentsResult.data ?? []) as Assessment[];

  const availableMonths = assessments.map((a) =>
    parseInt(a.date_taken.slice(5, 7), 10)
  );

  const selected = month
    ? (assessments.find((a) => parseInt(a.date_taken.slice(5, 7), 10) === month) ?? null)
    : null;

  return (
    <UserReportUI
      assessments={month ? (selected ? [selected] : []) : assessments}
      availableMonths={availableMonths}
      selected={selected}
      year={year}
      month={month}
      name={profile?.full_name ?? ""}
      rank={profile?.rank ?? null}
    />
  );
}
