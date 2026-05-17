"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, getAdminClient } from "@/lib/auth/guards";
import {
  PersonnelUpdateStatusSchema,
  NotifyPersonnelSchema,
} from "@/lib/validation/schemas";
import { withActionGuard } from "@/lib/errors";
import { audit, logger } from "@/lib/logger";
import type { PersonnelRecord, PersonnelStatus, Profile, Assessment } from "@/lib/types";
import { sendEmail } from "@/lib/email/resend";
import {
  bmiReminderEmail,
  assessmentApprovedEmail,
  assessmentReturnedEmail,
} from "@/lib/email/templates";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function lastDayOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).toISOString().split("T")[0];
}

function toYearMonth(dateTaken: string): string {
  return dateTaken.slice(0, 7);
}

export async function getPersonnelRecords(month: string): Promise<PersonnelRecord[]> {
  await requireAdmin();

  if (!/^\d{4}-\d{2}$/.test(month)) return [];

  const admin     = getAdminClient();
  const startDate = `${month}-01`;
  const endDate   = lastDayOfMonth(month);

  const [{ data: profiles, error: profilesError }, { data: assessments }] =
    await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, badge_number, full_name, first_name, last_name, middle_name, qualifier, rank, unit_station, gender, birthdate, email, role, is_approved, archived_at, created_at, updated_at"
        )
        .is("archived_at", null)
        .order("full_name", { ascending: true }),
      admin
        .from("bmi_assessments")
        .select("*")
        .gte("date_taken", startDate)
        .lte("date_taken", endDate),
    ]);

  if (profilesError)
    logger.error("action", "getPersonnelRecords failed", { error: profilesError.message, month });

  const assessmentMap = new Map<string, Assessment>(
    (assessments ?? []).map((a) => [a.user_id, a as Assessment])
  );

  return (profiles ?? []).map((p) => {
    const profile    = p as Profile;
    const assessment = assessmentMap.get(p.id) ?? null;

    let status: PersonnelStatus = "not_started";
    if (assessment) {
      const s = assessment.status;
      if (s === "pending_approval") status = "pending_approval";
      else if (s === "approved")    status = "approved";
      else if (s === "returned")    status = "returned";
    }

    return { profile, assessment, status };
  });
}

export async function updateAssessmentStatus(
  id:               string,
  status:           "approved" | "returned",
  rejectionReason?: string
): Promise<{ error?: string }> {
  return withActionGuard(async () => {
    const { userId: actorId } = await requireAdmin();

    const parsed = PersonnelUpdateStatusSchema.safeParse({ id, status, rejectionReason });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const admin = getAdminClient();

    const { data: assessment } = await admin
      .from("bmi_assessments")
      .select("user_id, date_taken, bmi_score, bmi_pnp_status")
      .eq("id", parsed.data.id)
      .single();

    const { error } = await admin
      .from("bmi_assessments")
      .update({
        status:           parsed.data.status,
        reviewed_by:      actorId,
        reviewed_at:      new Date().toISOString(),
        rejection_reason: parsed.data.rejectionReason ?? null,
        updated_at:       new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .eq("status", "pending_approval");

    if (error) throw error;

    audit(
      status === "approved" ? "assessment.approved" : "assessment.returned",
      actorId,
      { assessmentId: id, status }
    );

    // Non-blocking email notification
    if (assessment) {
      const { data: profile } = await admin
        .from("profiles")
        .select("email, full_name, badge_number, rank")
        .eq("id", assessment.user_id)
        .single();

      if (profile?.email) {
        const month = toYearMonth(assessment.date_taken);
        const base  = appUrl();

        if (status === "approved") {
          const { subject, html } = assessmentApprovedEmail({
            officerName: profile.full_name,
            badgeNumber: profile.badge_number,
            rank:        profile.rank ?? null,
            month,
            bmiScore:    assessment.bmi_score,
            pnpStatus:   assessment.bmi_pnp_status,
            appUrl:      base,
          });
          await sendEmail({ to: profile.email, subject, html });
        } else {
          const { subject, html } = assessmentReturnedEmail({
            officerName:  profile.full_name,
            badgeNumber:  profile.badge_number,
            rank:         profile.rank ?? null,
            month,
            returnReason: parsed.data.rejectionReason ?? "No reason provided.",
            appUrl:       base,
          });
          await sendEmail({ to: profile.email, subject, html });
        }
      }
    }

    revalidatePath("/dashboard/personnel");
    return {};
  });
}

export async function notifyPersonnel(
  userId: string,
  month?: string
): Promise<{ error?: string }> {
  return withActionGuard(async () => {
    await requireAdmin();

    const parsed = NotifyPersonnelSchema.safeParse({ userId, month });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const admin = getAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name, badge_number, rank")
      .eq("id", parsed.data.userId)
      .single();

    if (!profile?.email) return { error: "Officer email not found." };

    const targetMonth =
      parsed.data.month ??
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

    const { subject, html } = bmiReminderEmail({
      officerName: profile.full_name,
      badgeNumber: profile.badge_number,
      rank:        profile.rank ?? null,
      month:       targetMonth,
      appUrl:      appUrl(),
    });

    return sendEmail({ to: profile.email, subject, html });
  });
}
