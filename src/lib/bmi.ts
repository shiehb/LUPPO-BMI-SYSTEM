// ── WHO Classification ─────────────────────────────────────────────────────

export type WHOCategory =
  | "Underweight"
  | "Normal"
  | "Overweight"
  | "Obese Class I"
  | "Obese Class II"
  | "Obese Class III";

// Backward-compat alias used throughout existing imports
export type BMIStatus = WHOCategory;

export function calculateBMI(weightKg: number, heightM: number): number {
  return weightKg / (heightM * heightM);
}

export function getWHOCategory(bmi: number): WHOCategory {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25.0) return "Normal";
  if (bmi < 30.0) return "Overweight";
  if (bmi < 35.0) return "Obese Class I";
  if (bmi < 40.0) return "Obese Class II";
  return "Obese Class III";
}

// Backward-compat alias
export const getBMIStatus = getWHOCategory;

export function getBMIStatusColor(status: WHOCategory): string {
  switch (status) {
    case "Underweight":    return "text-blue-600";
    case "Normal":         return "text-green-600";
    case "Overweight":     return "text-yellow-600";
    case "Obese Class I":  return "text-orange-600";
    case "Obese Class II": return "text-red-600";
    case "Obese Class III":return "text-red-800";
    default:               return "text-gray-600";
  }
}

// ── PNP Classification ─────────────────────────────────────────────────────

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

// Backward-compat alias
export type PNPStatus = PNPClassification;

export type WaistRisk = "low" | "increased" | "high";
export type BodyFrame = "small" | "medium" | "large";

export function getWaistRisk(
  waistCm: number,
  gender: "Male" | "Female"
): WaistRisk {
  if (gender === "Male") {
    if (waistCm < 90) return "low";
    if (waistCm < 100) return "increased";
    return "high";
  } else {
    if (waistCm < 80) return "low";
    if (waistCm < 90) return "increased";
    return "high";
  }
}

// Uses height-to-wrist ratio per standard anthropometric tables
export function getBodyFrame(
  heightM: number,
  wristCm: number,
  gender: "Male" | "Female"
): BodyFrame {
  const r = (heightM * 100) / wristCm;
  if (gender === "Male") {
    if (r > 10.4) return "small";
    if (r >= 9.6) return "medium";
    return "large";
  } else {
    if (r > 11.0) return "small";
    if (r >= 10.1) return "medium";
    return "large";
  }
}

export function getPNPClassification(params: {
  bmi: number;
  waistCm: number | null;
  wristCm: number | null;
  heightM: number;
  age: number | null;
  gender: "Male" | "Female" | null;
}): PNPClassification {
  const { bmi, waistCm, wristCm, heightM, age, gender } = params;

  const whoCategory = getWHOCategory(bmi);

  // 1. High waist circumference overrides everything (central obesity risk)
  if (waistCm !== null && gender !== null) {
    if (getWaistRisk(waistCm, gender) === "high") {
      return "At Risk (Central Obesity)";
    }
  }

  // 2. Underweight and Normal follow WHO directly
  if (whoCategory === "Underweight" || whoCategory === "Normal") {
    return whoCategory;
  }

  // 3. Obese I/II/III: no frame or age overrides apply
  if (whoCategory !== "Overweight") {
    return whoCategory;
  }

  // 4. Overweight: check age and frame adjustments
  if (age !== null && age >= 40) {
    return "Acceptable BMI by Age";
  }

  if (wristCm !== null && gender !== null) {
    if (getBodyFrame(heightM, wristCm, gender) === "large") {
      return "Acceptable BMI by Large Frame";
    }
  }

  return "Overweight";
}

export function getPNPStatusColor(status: PNPClassification): string {
  switch (status) {
    case "Normal":                         return "text-green-600";
    case "Underweight":                    return "text-blue-600";
    case "Overweight":                     return "text-yellow-600";
    case "Obese Class I":                  return "text-orange-600";
    case "Obese Class II":                 return "text-red-600";
    case "Obese Class III":                return "text-red-800";
    case "At Risk (Central Obesity)":      return "text-red-700";
    case "Acceptable BMI by Large Frame":  return "text-emerald-600";
    case "Acceptable BMI by Age":          return "text-teal-600";
    default:                               return "text-gray-600";
  }
}

// ── Legacy alias (BMI-only, no context) ────────────────────────────────────
// Kept for any call site that only has BMI available
export function getPNPStatus(bmi: number): PNPClassification {
  return getWHOCategory(bmi);
}

// ── Utility ────────────────────────────────────────────────────────────────

export function getNormalWeightRange(heightM: number): { min: number; max: number } {
  return {
    min: parseFloat((18.5 * heightM * heightM).toFixed(1)),
    max: parseFloat((24.9 * heightM * heightM).toFixed(1)),
  };
}

export function getWeightToLose(weightKg: number, heightM: number): number {
  const max = 24.9 * heightM * heightM;
  return parseFloat(Math.max(0, weightKg - max).toFixed(1));
}
