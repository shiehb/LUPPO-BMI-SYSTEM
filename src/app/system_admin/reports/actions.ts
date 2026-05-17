"use server";

import { requireAuth, getAdminClient } from "@/lib/auth/guards";
import type { Assessment, Profile } from "@/lib/types";

/* ── SHARED TYPES ─────────────────────────────────────────────────────────── */

export interface YearlyEntry {
  weight: number;
  bmi_score: number;
  date_taken: string;
}

export interface ReviewerSnippet {
  full_name: string;
  rank: string | null;
}

export interface PrintAssessmentData {
  assessment: Assessment;
  profile: Profile;
  yearlyAssessments: YearlyEntry[];
  reviewer: ReviewerSnippet | null;
}

/**
 * Typed result that callers use to distinguish "resource not found" from
 * "resource exists but belongs to a different user".  The distinction matters
 * so the print page can return an appropriate HTTP status (404 vs 403).
 */
export type AssessmentForPrintResult =
  | { ok: true;  data: PrintAssessmentData }
  | { ok: false; reason: "not_found" | "forbidden" };

/* ── SERVER ACTION ────────────────────────────────────────────────────────── */

export async function getAssessmentForPrint(
  id: string
): Promise<AssessmentForPrintResult> {
  // Any authenticated user may request a print — but ONLY for their own record.
  const { userId } = await requireAuth();

  const admin = getAdminClient();

  const { data: raw } = await admin
    .from("bmi_assessments")
    .select("*")
    .eq("id", id)
    .single();

  if (!raw) return { ok: false, reason: "not_found" };

  const assessment = raw as Assessment;

  /* ── STRICT OWNERSHIP GUARDRAIL ────────────────────────────────────────────
     Reject immediately when the assessment belongs to a different user.
     This blocks URL-guessing / ID-swapping attacks regardless of role.
     ──────────────────────────────────────────────────────────────────────── */
  if (assessment.user_id !== userId) {
    return { ok: false, reason: "forbidden" };
  }

  const year = assessment.date_taken.slice(0, 4);

  const [{ data: profileRaw }, { data: yearlyRaw }] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, badge_number, full_name, first_name, last_name, middle_name, qualifier, rank, unit_station, gender, birthdate, email, role, archived_at, created_at"
      )
      .eq("id", assessment.user_id)
      .single(),
    admin
      .from("bmi_assessments")
      .select("weight, bmi_score, date_taken")
      .eq("user_id", assessment.user_id)
      .gte("date_taken", `${year}-01-01`)
      .lte("date_taken", `${year}-12-31`)
      .neq("status", "draft")
      .order("date_taken", { ascending: true }),
  ]);

  if (!profileRaw) return { ok: false, reason: "not_found" };

  let reviewer: ReviewerSnippet | null = null;
  if (assessment.reviewed_by) {
    const { data } = await admin
      .from("profiles")
      .select("full_name, rank")
      .eq("id", assessment.reviewed_by)
      .single();
    reviewer = data as ReviewerSnippet | null;
  }

  return {
    ok: true,
    data: {
      assessment,
      profile: profileRaw as Profile,
      yearlyAssessments: (yearlyRaw ?? []) as YearlyEntry[],
      reviewer,
    },
  };
}
