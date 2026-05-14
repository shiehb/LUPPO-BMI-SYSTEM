import { create } from "zustand";
import { calculateBMI, getWHOCategory, getNormalWeightRange, getWeightToLose } from "@/lib/utils/bmi";
import { getBodyFrame }                   from "@/lib/utils/wrist";
import { getWaistStatus, getWaistRisk }   from "@/lib/utils/waist";
import { calculateWHR, getWHRRisk }       from "@/lib/utils/hip";
import { getPNPClassification }           from "@/lib/utils/pnp";
import type { WHOCategory }               from "@/lib/utils/bmi";
import type { BodyFrame }                 from "@/lib/utils/wrist";
import type { WaistStatus, WaistRisk }    from "@/lib/utils/waist";
import type { WHRRiskLevel }              from "@/lib/utils/hip";
import type { PNPClassification }         from "@/lib/utils/pnp";

interface Measurements {
  weightKg: number | null;
  heightM:  number | null;
  waistCm:  number | null;
  hipCm:    number | null;
  wristCm:  number | null;
}

interface ProfileContext {
  age:    number | null;
  gender: "Male" | "Female" | null;
}

export interface AssessmentPreview {
  bmi:                number;
  whoCategory:        WHOCategory;
  pnpClassification:  PNPClassification;
  normalWeightMin:    number;
  normalWeightMax:    number;
  weightToLose:       number;
  frameSize:          BodyFrame | null;
  whr:                number | null;
  whrRisk:            WHRRiskLevel | null;
  waistStatus:        WaistStatus | null;
  waistRisk:          WaistRisk | null;
}

interface ProfileImageState {
  file:        File | null;
  preview:     string | null;
  existingUrl: string | null;
}

interface AssessmentStoreState extends Measurements, ProfileContext {
  profileImage: ProfileImageState;

  setMeasurements:          (m: Partial<Measurements>) => void;
  setProfileContext:         (ctx: ProfileContext) => void;
  setProfileImage:          (file: File, preview: string) => void;
  removeProfileImage:       () => void;
  setExistingProfileImageUrl: (url: string | null) => void;
  reset:                    () => void;
}

const initialState: Omit<AssessmentStoreState, keyof {
  setMeasurements: unknown;
  setProfileContext: unknown;
  setProfileImage: unknown;
  removeProfileImage: unknown;
  setExistingProfileImageUrl: unknown;
  reset: unknown;
}> = {
  weightKg: null,
  heightM:  null,
  waistCm:  null,
  hipCm:    null,
  wristCm:  null,
  age:      null,
  gender:   null,
  profileImage: { file: null, preview: null, existingUrl: null },
};

export const useAssessmentStore = create<AssessmentStoreState>((set) => ({
  ...initialState,

  setMeasurements: (m) => set((s) => ({ ...s, ...m })),

  setProfileContext: (ctx) => set((s) => ({ ...s, ...ctx })),

  setProfileImage: (file, preview) =>
    set((s) => ({
      profileImage: { ...s.profileImage, file, preview },
    })),

  removeProfileImage: () =>
    set((s) => ({
      profileImage: { ...s.profileImage, file: null, preview: null },
    })),

  setExistingProfileImageUrl: (url) =>
    set((s) => ({
      profileImage: { ...s.profileImage, existingUrl: url },
    })),

  reset: () => set(initialState),
}));

// Selector: compute the live preview from stored measurements
export function computePreview(
  s: Pick<AssessmentStoreState, "weightKg" | "heightM" | "waistCm" | "hipCm" | "wristCm" | "age" | "gender">
): AssessmentPreview | null {
  const { weightKg, heightM, waistCm, hipCm, wristCm, age, gender } = s;
  if (!weightKg || !heightM || weightKg <= 0 || heightM <= 0) return null;

  const bmi           = calculateBMI(weightKg, heightM);
  const whoCategory   = getWHOCategory(bmi);
  const { min, max }  = getNormalWeightRange(heightM);
  const weightToLose  = getWeightToLose(weightKg, heightM);

  const pnpClassification = getPNPClassification({
    bmi,
    waistCm: waistCm ?? null,
    wristCm: wristCm ?? null,
    heightM,
    age:    age ?? null,
    gender: gender ?? null,
  });

  const frameSize =
    wristCm !== null && gender !== null
      ? getBodyFrame(heightM * 100, wristCm, gender)
      : null;

  const whr =
    waistCm !== null && hipCm !== null
      ? calculateWHR(waistCm, hipCm)
      : null;

  const whrRisk =
    whr !== null && gender !== null ? getWHRRisk(whr, gender) : null;

  const waistStatus =
    waistCm !== null && gender !== null
      ? getWaistStatus(waistCm, gender)
      : null;

  const waistRisk =
    waistCm !== null && gender !== null
      ? getWaistRisk(waistCm, gender)
      : null;

  return {
    bmi,
    whoCategory,
    pnpClassification,
    normalWeightMin: min,
    normalWeightMax: max,
    weightToLose,
    frameSize,
    whr,
    whrRisk,
    waistStatus,
    waistRisk,
  };
}

export function useAssessmentPreview(): AssessmentPreview | null {
  return useAssessmentStore((s) => computePreview(s));
}
