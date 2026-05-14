"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { PersonnelRecord, PersonnelStatus, Profile, Assessment } from "@/lib/types";
import { sendEmail } from "@/lib/email/resend";
import {
  bmiReminderEmail,
  assessmentApprovedEmail,
  assessmentRejectedEmail,
} from "@/lib/email/templates";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/** Returns the last calendar day of a YYYY-MM month as a YYYY-MM-DD string. */
function lastDayOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).toISOString().split("T")[0];
}

/** Derives "YYYY-MM" from a "YYYY-MM-DD" date string. */
function toYearMonth(dateTaken: string): string {
  return dateTaken.slice(0, 7);
}

export async function getPersonnelRecords(month: string): Promise<PersonnelRecord[]> {
  const admin = getAdminClient();

  // Date range is more reliable than the generated assessment_month column
  // and works even before the migration is applied.
  const startDate = `${month}-01`;
  const endDate = lastDayOfMonth(month);

  const [{ data: profiles, error: profilesError }, { data: assessments }] =
    await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, badge_number, full_name, first_name, last_name, middle_name, qualifier, rank, unit_station, gender, birthdate, email, role, archived_at, created_at, updated_at"
        )
        .is("archived_at", null)
        // No role filter — all personnel (user / admin / system_admin) need BMI assessments
        .order("full_name", { ascending: true }),

      admin
        .from("bmi_assessments")
        .select("*")
        .gte("date_taken", startDate)
        .lte("date_taken", endDate),
    ]);

  if (profilesError) {
    console.error("[getPersonnelRecords] profiles error:", profilesError.message);
  }

  const assessmentMap = new Map<string, Assessment>(
    (assessments ?? []).map((a) => [a.user_id, a as Assessment])
  );

  return (profiles ?? []).map((p) => {
    const profile = p as Profile;
    const assessment = assessmentMap.get(p.id) ?? null;

    let status: PersonnelStatus = "not_started";
    if (assessment) {
      const s = assessment.status;
      if (s === "pending_approval") status = "pending_approval";
      else if (s === "approved") status = "approved";
      else if (s === "rejected") status = "rejected";
      // draft → not_started from admin perspective
    }

    return { profile, assessment, status };
  });
}

export async function updateAssessmentStatus(
  id: string,
  status: "approved" | "rejected",
  rejectionReason?: string
): Promise<{ error?: string }> {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let admin;
  try {
    admin = getAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Fetch the assessment + officer profile before updating so we have email/name for notification
  const { data: assessment } = await admin
    .from("bmi_assessments")
    .select("user_id, date_taken, bmi_score, bmi_pnp_status")
    .eq("id", id)
    .single();

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

  // Send email notification (non-blocking — don't fail the action if email fails)
  if (assessment) {
    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name, badge_number, rank")
      .eq("id", assessment.user_id)
      .single();

    if (profile?.email) {
      const month = toYearMonth(assessment.date_taken);
      const base = appUrl();

      if (status === "approved") {
        const { subject, html } = assessmentApprovedEmail({
          officerName: profile.full_name,
          badgeNumber: profile.badge_number,
          rank: profile.rank ?? null,
          month,
          bmiScore: assessment.bmi_score,
          pnpStatus: assessment.bmi_pnp_status,
          appUrl: base,
        });
        await sendEmail({ to: profile.email, subject, html });
      } else {
        const { subject, html } = assessmentRejectedEmail({
          officerName: profile.full_name,
          badgeNumber: profile.badge_number,
          rank: profile.rank ?? null,
          month,
          rejectionReason: rejectionReason ?? "No reason provided.",
          appUrl: base,
        });
        await sendEmail({ to: profile.email, subject, html });
      }
    }
  }

  revalidatePath("/system_admin/personnel");
  revalidatePath("/system_admin/assessments");
  return {};
}

export async function notifyPersonnel(
  userId: string,
  month?: string
): Promise<{ error?: string }> {
  let admin;
  try {
    admin = getAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name, badge_number, rank")
    .eq("id", userId)
    .single();

  if (!profile?.email) return { error: "Officer email not found." };

  const targetMonth =
    month ??
    (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();

  const { subject, html } = bmiReminderEmail({
    officerName: profile.full_name,
    badgeNumber: profile.badge_number,
    rank: profile.rank ?? null,
    month: targetMonth,
    appUrl: appUrl(),
  });

  return sendEmail({ to: profile.email, subject, html });
}
