import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Assessment, Profile } from "@/lib/types";
import { AssessmentInput }  from "../AssessmentInput";
import { AssessmentReview } from "../AssessmentReview";
import { PendingView }      from "../PendingView";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

function calculateAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const Breadcrumb = () => (
  <Link
    href="/user/assessment"
    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
  >
    <ChevronLeft className="size-4" />
    My Assessments
  </Link>
);

export default async function NewAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; id?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { edit, id } = await searchParams;

  const admin = getAdminClient();
  const assessmentQuery = id
    ? admin
        .from("bmi_assessments")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle()
    : admin
        .from("bmi_assessments")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["draft", "pending_approval", "revision_required", "returned"])
        .order("updated_at", { ascending: false })
        .maybeSingle();

  const [profileResult, assessmentResult] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).single(),
    assessmentQuery,
  ]);

  const profile = profileResult.data as Profile | null;
  if (!profile) redirect("/login");

  const assessment = assessmentResult.data as Assessment | null;
  const age = profile.birthdate ? calculateAge(profile.birthdate) : null;

  // Pending: read-only view, can't edit
  if (assessment?.status === "pending_approval") {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Breadcrumb />
        <PendingView assessment={assessment} name={profile.full_name} rank={profile.rank} />
      </div>
    );
  }

  // Draft, revision_required, or returned + not in edit mode → show review step
  if (
    (assessment?.status === "draft" || assessment?.status === "revision_required" || assessment?.status === "returned") &&
    edit !== "1"
  ) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Breadcrumb />
        <AssessmentReview assessment={assessment} gender={profile.gender} />
      </div>
    );
  }

  // Input step: no draft yet, or user clicked "Edit" on the review
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Breadcrumb />
      <AssessmentInput
        profile={profile}
        age={age}
        initialData={
          assessment?.status === "draft" || assessment?.status === "revision_required" || assessment?.status === "returned"
            ? assessment
            : null
        }
      />
    </div>
  );
}
