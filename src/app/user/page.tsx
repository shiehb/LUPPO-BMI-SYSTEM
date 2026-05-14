import Link from "next/link";
import { AlertCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let banner: React.ReactNode = null;

  if (user) {
    const { data: assessment } = await supabase
      .from("bmi_assessments")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["draft", "pending_approval"])
      .order("updated_at", { ascending: false })
      .maybeSingle();

    if (assessment?.status === "draft") {
      banner = (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="size-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            You have an unfinished assessment.{" "}
            <Link
              href="/user/assessment"
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              Continue Assessment →
            </Link>
          </p>
        </div>
      );
    } else if (assessment?.status === "pending_approval") {
      banner = (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <Clock className="size-4 shrink-0 text-blue-600" />
          <p className="text-sm text-blue-800">
            Your assessment is{" "}
            <span className="font-semibold">pending Admin approval</span>.{" "}
            <Link
              href="/user/assessment"
              className="underline underline-offset-2 hover:no-underline"
            >
              View details →
            </Link>
          </p>
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Dashboard</h1>

      {banner}

      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>
      <div className="min-h-64 rounded-xl bg-muted/50" />
    </div>
  );
}
