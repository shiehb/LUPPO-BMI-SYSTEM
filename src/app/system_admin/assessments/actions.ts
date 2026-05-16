"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, getAdminClient } from "@/lib/auth/guards";
import { UpdateAssessmentStatusSchema, UuidSchema } from "@/lib/validation/schemas";
import { withActionGuard } from "@/lib/errors";
import { audit } from "@/lib/logger";

export async function updateAssessmentStatus(
  id:           string,
  status:       "approved" | "revision_required" | "returned",
  adminRemarks?: string
): Promise<{ error?: string }> {
  return withActionGuard(async () => {
    const { userId: actorId } = await requireAdmin();

    const parsed = UpdateAssessmentStatusSchema.safeParse({ id, status, adminRemarks });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const admin = getAdminClient();
    const { error } = await admin
      .from("bmi_assessments")
      .update({
        status:        parsed.data.status,
        reviewed_by:   actorId,
        reviewed_at:   new Date().toISOString(),
        admin_remarks: parsed.data.adminRemarks ?? null,
        updated_at:    new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .eq("status", "pending_approval");

    if (error) throw error;

    audit(
      status === "approved" ? "assessment.approved" : "assessment.returned",
      actorId,
      { assessmentId: id, status }
    );

    revalidatePath("/system_admin/assessments");
    return {};
  });
}

export async function allowEditRequest(id: string): Promise<{ error?: string }> {
  return withActionGuard(async () => {
    const { userId: actorId } = await requireAdmin();

    const idParsed = UuidSchema.safeParse(id);
    if (!idParsed.success) return { error: "Invalid assessment ID." };

    const admin = getAdminClient();
    const now   = new Date().toISOString();

    const { error } = await admin
      .from("bmi_assessments")
      .update({
        status:            "draft",
        edit_requested:    false,
        edit_requested_at: null,
        submitted_at:      null,
        certified_at:      null,
        updated_at:        now,
      })
      .eq("id", idParsed.data)
      .eq("status", "pending_approval")
      .eq("edit_requested", true);

    if (error) throw error;

    audit("assessment.returned", actorId, { assessmentId: id, reason: "edit_request_allowed" });
    revalidatePath("/system_admin/assessments");
    return {};
  });
}
