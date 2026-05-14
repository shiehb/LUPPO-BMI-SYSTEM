// Waist circumference risk thresholds (PNP standard)
// Male:   <= 90 cm → Acceptable | > 90 cm → Overweight Risk
// Female: <= 80 cm → Acceptable | > 80 cm → Overweight Risk
export type WaistStatus = "Acceptable" | "Overweight Risk";
export type WaistRisk   = "low" | "increased" | "high";

export function getWaistStatus(
  waistCm: number,
  gender: "Male" | "Female"
): WaistStatus {
  if (gender === "Male") return waistCm <= 90 ? "Acceptable" : "Overweight Risk";
  return waistCm <= 80 ? "Acceptable" : "Overweight Risk";
}

export function getWaistRisk(
  waistCm: number,
  gender: "Male" | "Female"
): WaistRisk {
  if (gender === "Male") {
    if (waistCm < 90)  return "low";
    if (waistCm < 100) return "increased";
    return "high";
  } else {
    if (waistCm < 80) return "low";
    if (waistCm < 90) return "increased";
    return "high";
  }
}

export function getWaistInterpretation(
  waistCm: number,
  gender: "Male" | "Female"
): string {
  const limit = gender === "Male" ? "90 cm" : "80 cm";
  const risk = getWaistRisk(waistCm, gender);
  switch (risk) {
    case "low":
      return `Within acceptable range (≤ ${limit}). Low cardiovascular risk.`;
    case "increased":
      return `Slightly above the limit (${limit}). Increased risk of metabolic complications.`;
    case "high":
      return `High waist circumference. Central obesity detected — elevated cardiovascular and metabolic risk.`;
  }
}

export function getWaistStatusBadgeClass(status: WaistStatus): string {
  switch (status) {
    case "Acceptable":     return "bg-green-100 text-green-800 border-green-200";
    case "Overweight Risk":return "bg-red-100 text-red-800 border-red-200";
  }
}
