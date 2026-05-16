import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Assessment, Profile } from "@/lib/types";
import { AssessmentReview } from "../../AssessmentReview";
import { PendingView } from "../../PendingView";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

export default async function ReviewAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = getAdminClient();
  const [profileResult, assessmentResult] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).single(),
    admin
      .from("bmi_assessments")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const profile = profileResult.data as Profile | null;
  if (!profile) redirect("/login");

  const assessment = assessmentResult.data as Assessment | null;
  if (!assessment) notFound();

  if (assessment.status === "pending_approval") {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <PendingView
          assessment={assessment}
          name={profile.full_name}
          rank={profile.rank}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <AssessmentReview assessment={assessment} gender={profile.gender} />
    </div>
  );
}
