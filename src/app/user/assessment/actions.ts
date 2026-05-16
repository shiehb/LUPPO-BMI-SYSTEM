"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import {
  calculateBMI,
  getWHOCategory,
  getNormalWeightRange,
  getWeightToLose,
} from "@/lib/bmi";
import { getPNPClassification, generateRemarks } from "@/lib/utils/pnp";
import { getBodyFrame } from "@/lib/utils/wrist";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

function calcAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export interface SaveDraftPayload {
  /**
   * "draft"  — relaxed: weight+height are required, everything else is optional.
   *            Status stays "draft" (or "revision_required" when editing one).
   * "submit" — strict: all measurements + all 3 photos required.
   *            Status transitions to "pending_approval".
   */
  intent:        "draft" | "submit";
  assessmentId?: string;     // when set, update this specific record (revision_required upsert)
  weight:        number | null;  // null only allowed for draft intent
  height:        number | null;  // null only allowed for draft intent
  waist:         number | null;
  hip:           number | null;
  wrist:         number | null;
  photoRightUrl: string | null;
  photoFrontUrl: string | null;
  photoLeftUrl:  string | null;
}

const REVALIDATE_PATHS = [
  "/user",
  "/user/assessment",
  "/user/assessment/add",
  "/user/assessment/edit",
  "/user/assessment/review",
];

function revalidateAll() {
  REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
}

export async function saveDraft(
  payload: SaveDraftPayload
): Promise<{ id?: string; error?: string }> {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let admin;
  try { admin = getAdminClient(); } catch (e) {
    return { error: (e as Error).message };
  }

  // ── Server-side strict validation (submit intent only) ──────────────────────
  if (payload.intent === "submit") {
    const missing: string[] = [];
    if (!payload.weight)        missing.push("weight");
    if (!payload.height)        missing.push("height");
    if (!payload.waist)         missing.push("waist");
    if (!payload.hip)           missing.push("hip");
    if (!payload.wrist)         missing.push("wrist");
    if (!payload.photoRightUrl) missing.push("right photo");
    if (!payload.photoFrontUrl) missing.push("front photo");
    if (!payload.photoLeftUrl)  missing.push("left photo");
    if (missing.length > 0)
      return { error: `Missing required fields: ${missing.join(", ")}.` };
  }

  const now = new Date().toISOString();

  // ── Build record ─────────────────────────────────────────────────────────────
  // If weight/height are missing (partial draft) skip BMI computation entirely
  // and store placeholder zeros so the row satisfies DB NOT NULL constraints.
  let record: Record<string, unknown>;

  if (payload.weight && payload.height) {
    const { data: profileData } = await admin
      .from("profiles")
      .select("gender, birthdate")
      .eq("id", user.id)
      .single();

    const age    = profileData?.birthdate ? calcAge(profileData.birthdate) : null;
    const gender = (profileData?.gender as "Male" | "Female" | null) ?? null;

    const bmi          = calculateBMI(payload.weight, payload.height);
    const { min, max } = getNormalWeightRange(payload.height);
    const weightToLose = getWeightToLose(payload.weight, payload.height);
    const whoCategory  = getWHOCategory(bmi);

    const pnpStatus = getPNPClassification({
      bmi,
      waistCm: payload.waist,
      wristCm: payload.wrist,
      heightM: payload.height,
      age,
      gender,
    });

    const frameSize: string | null =
      payload.wrist !== null && gender !== null
        ? getBodyFrame(payload.height * 100, payload.wrist, gender)
        : null;

    const remarks = generateRemarks({
      bmi,
      whoCategory,
      pnpClassification: pnpStatus,
      waistCm:     payload.waist,
      hipCm:       payload.hip,
      wristCm:     payload.wrist,
      heightM:     payload.height,
      gender,
      frameSize,
      weightToLose,
    });

    record = {
      user_id:           user.id,
      weight:            payload.weight,
      height:            payload.height,
      waist:             payload.waist,
      hip:               payload.hip,
      wrist:             payload.wrist,
      bmi_score:         parseFloat(bmi.toFixed(2)),
      bmi_who_status:    whoCategory,
      bmi_pnp_status:    pnpStatus,
      weight_to_lose:    weightToLose,
      normal_weight_min: min,
      normal_weight_max: max,
      photo_right_url:   payload.photoRightUrl,
      photo_front_url:   payload.photoFrontUrl,
      photo_left_url:    payload.photoLeftUrl,
      frame_size:        frameSize,
      remarks,
      date_taken:        now.split("T")[0],
      updated_at:        now,
    };
  } else {
    // Skeleton draft — weight/height not yet provided
    record = {
      user_id:           user.id,
      weight:            0,
      height:            0,
      waist:             payload.waist,
      hip:               payload.hip,
      wrist:             payload.wrist,
      bmi_score:         0,
      bmi_who_status:    "",
      bmi_pnp_status:    "",
      weight_to_lose:    0,
      normal_weight_min: 0,
      normal_weight_max: 0,
      photo_right_url:   payload.photoRightUrl,
      photo_front_url:   payload.photoFrontUrl,
      photo_left_url:    payload.photoLeftUrl,
      frame_size:        null,
      remarks:           null,
      date_taken:        now.split("T")[0],
      updated_at:        now,
    };
  }

  // ── Upsert path: editing a revision_required or returned record ─────────────
  if (payload.assessmentId) {
    const { data: existing } = await admin
      .from("bmi_assessments")
      .select("id, status")
      .eq("id", payload.assessmentId)
      .eq("user_id", user.id)
      .single();

    if (existing?.status === "revision_required" || existing?.status === "returned") {
      const currentStatus = existing.status;
      const isSubmitting = payload.intent === "submit";
      const { error } = await admin
        .from("bmi_assessments")
        .update({
          ...record,
          status:           isSubmitting ? "pending_approval" : currentStatus,
          admin_remarks:    isSubmitting ? null : undefined,
          rejection_reason: isSubmitting ? null : undefined,
          submitted_at:     isSubmitting ? now : undefined,
          certified_at:     isSubmitting ? now : undefined,
        })
        .eq("id", payload.assessmentId);

      if (error) return { error: error.message };
      revalidateAll();
      return { id: payload.assessmentId };
    }
  }

  // ── Normal draft path ────────────────────────────────────────────────────────
  const { data: existingDraft } = await admin
    .from("bmi_assessments")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "draft")
    .maybeSingle();

  const targetStatus = payload.intent === "submit" ? "pending_approval" : "draft";
  const submitTimestamps =
    payload.intent === "submit"
      ? { submitted_at: now, certified_at: now }
      : {};

  if (existingDraft?.id) {
    const { error } = await admin
      .from("bmi_assessments")
      .update({ ...record, status: targetStatus, ...submitTimestamps })
      .eq("id", existingDraft.id);
    if (error) return { error: error.message };
    revalidateAll();
    return { id: existingDraft.id };
  }

  const { data, error } = await admin
    .from("bmi_assessments")
    .insert({ ...record, status: targetStatus, ...submitTimestamps })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidateAll();
  return { id: data.id };
}

export async function submitAssessment(
  id: string
): Promise<{ error?: string }> {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let admin;
  try { admin = getAdminClient(); } catch (e) {
    return { error: (e as Error).message };
  }

  // Fetch the record to validate completeness before transitioning
  const { data: assessment } = await admin
    .from("bmi_assessments")
    .select("waist, hip, wrist, photo_right_url, photo_front_url, photo_left_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .in("status", ["draft", "revision_required", "returned"])
    .single();

  if (!assessment) return { error: "Assessment not found." };

  const missing: string[] = [];
  if (!assessment.waist)           missing.push("waist");
  if (!assessment.hip)             missing.push("hip");
  if (!assessment.wrist)           missing.push("wrist");
  if (!assessment.photo_right_url) missing.push("right photo");
  if (!assessment.photo_front_url) missing.push("front photo");
  if (!assessment.photo_left_url)  missing.push("left photo");
  if (missing.length > 0)
    return { error: `Complete your draft before submitting. Missing: ${missing.join(", ")}.` };

  const now = new Date().toISOString();
  const { error } = await admin
    .from("bmi_assessments")
    .update({
      status:        "pending_approval",
      certified_at:  now,
      submitted_at:  now,
      updated_at:    now,
      admin_remarks: null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .in("status", ["draft", "revision_required", "returned"]);

  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export async function requestEdit(
  id: string
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
      edit_requested:    true,
      edit_requested_at: new Date().toISOString(),
      updated_at:        new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending_approval");

  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export async function requestRevision(
  id: string
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
      status:       "draft",
      submitted_at: null,
      certified_at: null,
      updated_at:   new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending_approval");

  if (error) return { error: error.message };
  revalidateAll();
  return {};
}
