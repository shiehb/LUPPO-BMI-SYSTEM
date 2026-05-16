import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { AssessmentInput } from "../AssessmentInput";

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

export default async function AddAssessmentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = getAdminClient();
  const [profileResult, existingResult] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).single(),
    admin
      .from("bmi_assessments")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["draft", "revision_required", "returned", "pending_approval"])
      .order("updated_at", { ascending: false })
      .maybeSingle(),
  ]);

  const profile = profileResult.data as Profile | null;
  if (!profile) redirect("/login");

  // Guard: prevent creating a second active assessment
  if (existingResult.data) {
    const { id, status } = existingResult.data;
    if (status === "pending_approval") redirect("/user/assessment");
    redirect(`/user/assessment/review/${id}`);
  }

  const age = profile.birthdate ? calculateAge(profile.birthdate) : null;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <AssessmentInput profile={profile} age={age} initialData={null} />
    </div>
  );
}
