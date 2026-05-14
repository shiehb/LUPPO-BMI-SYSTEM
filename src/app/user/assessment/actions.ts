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
  weight:        number;
  height:        number;
  waist:         number | null;
  hip:           number | null;
  wrist:         number | null;
  photoRightUrl: string | null;
  photoFrontUrl: string | null;
  photoLeftUrl:  string | null;
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

  const { data: profileData } = await admin
    .from("profiles")
    .select("gender, birthdate")
    .eq("id", user.id)
    .single();

  const age    = profileData?.birthdate ? calcAge(profileData.birthdate) : null;
  const gender = (profileData?.gender as "Male" | "Female" | null) ?? null;

  const bmi           = calculateBMI(payload.weight, payload.height);
  const { min, max }  = getNormalWeightRange(payload.height);
  const weightToLose  = getWeightToLose(payload.weight, payload.height);

  const whoCategory = getWHOCategory(bmi);
  const pnpStatus   = getPNPClassification({
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
    waistCm:  payload.waist,
    hipCm:    payload.hip,
    wristCm:  payload.wrist,
    heightM:  payload.height,
    gender,
    frameSize,
    weightToLose,
  });

  const record = {
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
    date_taken:        new Date().toISOString().split("T")[0],
    updated_at:        new Date().toISOString(),
  };

  const { data: existing } = await admin
    .from("bmi_assessments")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "draft")
    .maybeSingle();

  if (existing?.id) {
    const { error } = await admin
      .from("bmi_assessments")
      .update(record)
      .eq("id", existing.id);
    if (error) return { error: error.message };
    revalidatePath("/user");
    revalidatePath("/user/assessment");
    revalidatePath("/user/assessment/new");
    return { id: existing.id };
  }

  const { data, error } = await admin
    .from("bmi_assessments")
    .insert({ ...record, status: "draft" })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/user");
  revalidatePath("/user/assessment");
  revalidatePath("/user/assessment/new");
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

  const { error } = await admin
    .from("bmi_assessments")
    .update({
      status:       "pending_approval",
      certified_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "draft");

  if (error) return { error: error.message };
  revalidatePath("/user");
  revalidatePath("/user/assessment");
  revalidatePath("/user/assessment/new");
  return {};
}
