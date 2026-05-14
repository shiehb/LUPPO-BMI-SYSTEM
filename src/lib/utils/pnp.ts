import { getWHOCategory }             from "./bmi";
import { getBodyFrame }               from "./wrist";
import { getWaistRisk, getWaistStatus } from "./waist";
import { calculateWHR, getWHRRisk }   from "./hip";

// PNP Acceptable Weight Standard
// Incorporates WHO BMI, waist circumference, frame size, and age.
export type PNPClassification =
  | "Underweight"
  | "Normal"
  | "Overweight"
  | "Obese Class I"
  | "Obese Class II"
  | "Obese Class III"
  | "At Risk (Central Obesity)"
  | "Acceptable BMI by Large Frame"
  | "Acceptable BMI by Age";

export function getPNPClassification(params: {
  bmi: number;
  waistCm: number | null;
  wristCm: number | null;
  heightM: number;
  age: number | null;
  gender: "Male" | "Female" | null;
}): PNPClassification {
  const { bmi, waistCm, wristCm, heightM, age, gender } = params;
  const who = getWHOCategory(bmi);

  // Central obesity always overrides classification
  if (waistCm !== null && gender !== null) {
    if (getWaistRisk(waistCm, gender) === "high") {
      return "At Risk (Central Obesity)";
    }
  }

  if (who === "Underweight" || who === "Normal") return who;

  // Obese Class I, II, III — no adjustments apply
  if (who !== "Overweight") return who;

  // Overweight: age exception (>= 40 years)
  if (age !== null && age >= 40) return "Acceptable BMI by Age";

  // Overweight: large frame exception
  if (wristCm !== null && gender !== null) {
    if (getBodyFrame(heightM * 100, wristCm, gender) === "Large") {
      return "Acceptable BMI by Large Frame";
    }
  }

  return "Overweight";
}

export function getPNPStatusColor(status: PNPClassification): string {
  switch (status) {
    case "Normal":                        return "text-green-600";
    case "Underweight":                   return "text-blue-600";
    case "Overweight":                    return "text-yellow-600";
    case "Obese Class I":                 return "text-orange-600";
    case "Obese Class II":                return "text-red-600";
    case "Obese Class III":               return "text-red-800";
    case "At Risk (Central Obesity)":     return "text-red-700";
    case "Acceptable BMI by Large Frame": return "text-emerald-600";
    case "Acceptable BMI by Age":         return "text-teal-600";
    default:                              return "text-gray-600";
  }
}

export function getPNPBadgeClass(status: PNPClassification): string {
  switch (status) {
    case "Normal":                        return "bg-green-100 text-green-800 border-green-200";
    case "Underweight":                   return "bg-blue-100 text-blue-800 border-blue-200";
    case "Overweight":                    return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Obese Class I":                 return "bg-orange-100 text-orange-800 border-orange-200";
    case "Obese Class II":                return "bg-red-100 text-red-800 border-red-200";
    case "Obese Class III":               return "bg-red-200 text-red-900 border-red-300";
    case "At Risk (Central Obesity)":     return "bg-red-100 text-red-800 border-red-200";
    case "Acceptable BMI by Large Frame": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Acceptable BMI by Age":         return "bg-teal-100 text-teal-800 border-teal-200";
    default:                              return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function getPNPWeightRecommendation(
  status: PNPClassification,
  weightToLose: number
): string {
  switch (status) {
    case "Normal":
    case "Acceptable BMI by Large Frame":
    case "Acceptable BMI by Age":
      return "Your weight is within acceptable standards for PNP service. Maintain your current fitness routine.";
    case "Underweight":
      return "You are below PNP weight standards. A supervised nutritional program to safely gain weight is recommended.";
    case "Overweight":
      return `You need to lose approximately ${weightToLose} kg to meet PNP fitness standards. A structured diet and exercise program is required.`;
    case "Obese Class I":
      return `You need to lose approximately ${weightToLose} kg. A medically supervised fitness program is required to comply with PNP standards.`;
    case "Obese Class II":
      return `You need to lose approximately ${weightToLose} kg. Medical-supervised weight loss is strongly recommended before reassessment.`;
    case "Obese Class III":
      return `You need to lose approximately ${weightToLose} kg. Immediate medical intervention is required. A comprehensive health management plan is necessary.`;
    case "At Risk (Central Obesity)":
      return "Central obesity detected. A targeted abdominal exercise and dietary program is required regardless of overall BMI classification.";
    default:
      return "Consult a PNP health officer for a personalized weight management program.";
  }
}

export function generateRemarks(params: {
  bmi: number;
  whoCategory: string;
  pnpClassification: string;
  waistCm: number | null;
  hipCm: number | null;
  wristCm: number | null;
  heightM: number;
  gender: "Male" | "Female" | null;
  frameSize: string | null;
  weightToLose: number;
}): string {
  const parts: string[] = [];

  parts.push(`BMI: ${params.bmi.toFixed(1)} — ${params.whoCategory} (WHO)`);
  parts.push(`PNP Classification: ${params.pnpClassification}`);

  if (params.waistCm !== null && params.gender !== null) {
    const ws = getWaistStatus(params.waistCm, params.gender);
    parts.push(`Waist: ${params.waistCm} cm (${ws})`);
  }

  if (params.waistCm !== null && params.hipCm !== null) {
    const whr = calculateWHR(params.waistCm, params.hipCm);
    const whrRisk = params.gender ? getWHRRisk(whr, params.gender) : "N/A";
    parts.push(`WHR: ${whr} (${whrRisk})`);
  }

  if (params.frameSize) parts.push(`Frame: ${params.frameSize}`);

  if (params.weightToLose > 0) {
    parts.push(`Weight to lose: ${params.weightToLose} kg`);
  } else {
    parts.push("Weight within normal range");
  }

  return parts.join(" | ");
}
