"use server";

import { requireSystemAdmin, getAdminClient } from "@/lib/auth/guards";
import { Role } from "@/lib/types";
import { AssessmentWindowSchema } from "@/lib/validation/schemas";
import { withActionGuard } from "@/lib/errors";
import { audit } from "@/lib/logger";

// ── Internal read helpers (no auth — called from already-authed actions) ──────

export async function getAssessmentWindow(monthStr: string) {
  const admin = getAdminClient();
  const { data } = await admin
    .from("assessment_windows")
    .select("*")
    .eq("month", monthStr)
    .maybeSingle();
  return data;
}

export interface AssessmentWindowStatus {
  isOpen:           boolean;
  isLateClosed:     boolean;
  isPrematureClosed: boolean;
  message?:         string;
}

export async function checkAssessmentWindowOpen(): Promise<AssessmentWindowStatus> {
  const now      = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const window   = await getAssessmentWindow(monthStr);

  if (!window) return { isOpen: true, isLateClosed: false, isPrematureClosed: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(window.start_date);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(window.end_date);
  endDate.setHours(23, 59, 59, 999);

  if (today < startDate)
    return {
      isOpen: false,
      isLateClosed: false,
      isPrematureClosed: true,
      message: "Assessment window has not opened yet.",
    };

  if (today > endDate)
    return {
      isOpen: false,
      isLateClosed: true,
      isPrematureClosed: false,
      message: "Assessment window is currently closed.",
    };

  return { isOpen: true, isLateClosed: false, isPrematureClosed: false };
}

export async function canBypassWindowClosed(role: Role | null, windowStatus: AssessmentWindowStatus) {
  return role === "system_admin" && windowStatus.isLateClosed;
}

export async function checkMonthlyAssessmentExists(
  userId: string
): Promise<{ hasExisting: boolean; assessment?: unknown }> {
  const admin    = getAdminClient();
  const now      = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data } = await admin
    .from("bmi_assessments")
    .select("id, status, date_taken, submitted_at")
    .eq("user_id", userId)
    .neq("status", "draft")
    .order("date_taken", { ascending: false })
    .maybeSingle();

  if (!data) return { hasExisting: false };

  const assessmentDate  = new Date(data.date_taken);
  const assessmentMonth = `${assessmentDate.getFullYear()}-${String(assessmentDate.getMonth() + 1).padStart(2, "0")}`;

  if (assessmentMonth === monthStr) return { hasExisting: true, assessment: data };
  return { hasExisting: false };
}

export async function validateAssessmentSubmission(userId: string): Promise<{
  valid:     boolean;
  message?:  string;
}> {
  const windowCheck = await checkAssessmentWindowOpen();
  if (!windowCheck.isOpen)
    return { valid: false, message: windowCheck.message || "Assessment window is closed." };

  const monthlyCheck = await checkMonthlyAssessmentExists(userId);
  if (monthlyCheck.hasExisting) {
    const currentMonth = new Date().toLocaleDateString("en-US", {
      month: "long",
      year:  "numeric",
    });
    return {
      valid:   false,
      message: `You have already submitted an assessment for ${currentMonth}. Only one assessment per month is allowed.`,
    };
  }

  return { valid: true };
}

// ── Admin mutation ────────────────────────────────────────────────────────────

export async function setAssessmentWindow(
  monthStr:  string,
  startDate: string,
  endDate:   string
): Promise<{ error?: string }> {
  return withActionGuard(async () => {
    const { userId: actorId } = await requireSystemAdmin();

    const parsed = AssessmentWindowSchema.safeParse({ monthStr, startDate, endDate });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const admin = getAdminClient();
    const { error } = await admin.from("assessment_windows").upsert(
      {
        month:      parsed.data.monthStr,
        start_date: parsed.data.startDate,
        end_date:   parsed.data.endDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "month" }
    );

    if (error) throw error;

    audit("assessment_window.changed", actorId, {
      month:     parsed.data.monthStr,
      startDate: parsed.data.startDate,
      endDate:   parsed.data.endDate,
    });

    return {};
  });
}
