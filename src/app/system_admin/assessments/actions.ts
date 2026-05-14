"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

export async function updateAssessmentStatus(
  id: string,
  status: "approved" | "rejected",
  rejectionReason?: string
): Promise<{ error?: string }> {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let admin;
  try { admin = getAdminClient(); } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await admin
    .from("bmi_assessments")
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending_approval");

  if (error) return { error: error.message };
  revalidatePath("/system_admin/assessments");
  return {};
}
