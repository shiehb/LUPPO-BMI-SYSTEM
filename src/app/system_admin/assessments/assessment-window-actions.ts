"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

/**
 * Fetch the assessment window for a given month
 * Returns null if no window is defined for that month
 */
export async function getAssessmentWindow(monthStr: string) {
  const admin = getAdminClient();
  const { data } = await admin
    .from("assessment_windows")
    .select("*")
    .eq("month", monthStr)
    .maybeSingle();
  return data;
}

/**
 * Check if the current date is within the assessment window for the current month
 * Returns { isOpen: boolean, message?: string }
 */
export async function checkAssessmentWindowOpen(): Promise<{
  isOpen: boolean;
  message?: string;
}> {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const window = await getAssessmentWindow(monthStr);

  if (!window) {
    // No window defined — allow submissions
    return { isOpen: true };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(window.start_date);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(window.end_date);
  endDate.setHours(23, 59, 59, 999);

  if (today < startDate || today > endDate) {
    return {
      isOpen: false,
      message: "Assessment window is currently closed.",
    };
  }

  return { isOpen: true };
}

/**
 * Set the assessment window for a given month (admin only)
 */
export async function setAssessmentWindow(
  monthStr: string,
  startDate: string,
  endDate: string
): Promise<{ error?: string }> {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check if user is system_admin
  const { data: profile } = await session
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "system_admin") {
    return { error: "Only system admins can set assessment windows." };
  }

  const admin = getAdminClient();

  // Validate date range
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) {
    return { error: "Start date must be before or equal to end date." };
  }

  const { error } = await admin
    .from("assessment_windows")
    .upsert(
      {
        month: monthStr,
        start_date: startDate,
        end_date: endDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "month" }
    );

  if (error) return { error: error.message };
  return {};
}

/**
 * Check if user already has an assessment for the current month
 * (excluding draft status — considers pending, approved, rejected, returned)
 * Returns { hasExisting: boolean, assessment?: Assessment }
 */
export async function checkMonthlyAssessmentExists(
  userId: string
): Promise<{ hasExisting: boolean; assessment?: any }> {
  const admin = getAdminClient();
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, month] = monthStr.split("-");

  // Query for any non-draft assessment in the current month for this user
  const { data } = await admin
    .from("bmi_assessments")
    .select("id, status, date_taken, submitted_at")
    .eq("user_id", userId)
    .neq("status", "draft")
    .order("date_taken", { ascending: false })
    .maybeSingle();

  if (!data) {
    return { hasExisting: false };
  }

  // Check if date_taken is in the current month
  const assessmentDate = new Date(data.date_taken);
  const assessmentYear = assessmentDate.getFullYear();
  const assessmentMonth = String(assessmentDate.getMonth() + 1).padStart(2, "0");

  const isCurrentMonth = `${assessmentYear}-${assessmentMonth}` === monthStr;

  if (isCurrentMonth) {
    return { hasExisting: true, assessment: data };
  }

  return { hasExisting: false };
}

/**
 * Validate assessment submission against window and monthly limit
 * Called as a guard in the backend to prevent API bypassing
 * Returns { valid: boolean, message?: string }
 */
export async function validateAssessmentSubmission(userId: string): Promise<{
  valid: boolean;
  message?: string;
}> {
  // Check assessment window
  const windowCheck = await checkAssessmentWindowOpen();
  if (!windowCheck.isOpen) {
    return {
      valid: false,
      message: windowCheck.message || "Assessment window is closed.",
    };
  }

  // Check monthly assessment limit
  const monthlyCheck = await checkMonthlyAssessmentExists(userId);
  if (monthlyCheck.hasExisting) {
    const currentMonth = new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    return {
      valid: false,
      message: `You have already submitted an assessment for ${currentMonth}. Only one assessment per month is allowed.`,
    };
  }

  return { valid: true };
}
