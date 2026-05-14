// Waist-to-Hip Ratio (WHR) — cardiovascular risk indicator
// Male:   < 0.90 Low | 0.90-0.95 Moderate | 0.95-1.00 High | >= 1.00 Very High
// Female: < 0.80 Low | 0.80-0.85 Moderate | 0.85-0.90 High | >= 0.90 Very High
export type WHRRiskLevel = "Low Risk" | "Moderate Risk" | "High Risk" | "Very High Risk";

export function calculateWHR(waistCm: number, hipCm: number): number {
  return parseFloat((waistCm / hipCm).toFixed(3));
}

export function getWHRRisk(
  whr: number,
  gender: "Male" | "Female"
): WHRRiskLevel {
  if (gender === "Male") {
    if (whr < 0.90) return "Low Risk";
    if (whr < 0.95) return "Moderate Risk";
    if (whr < 1.00) return "High Risk";
    return "Very High Risk";
  } else {
    if (whr < 0.80) return "Low Risk";
    if (whr < 0.85) return "Moderate Risk";
    if (whr < 0.90) return "High Risk";
    return "Very High Risk";
  }
}

export function getWHRInterpretation(
  whr: number,
  gender: "Male" | "Female"
): string {
  const risk = getWHRRisk(whr, gender);
  switch (risk) {
    case "Low Risk":
      return `WHR ${whr} — low cardiovascular risk. Body fat distribution is healthy.`;
    case "Moderate Risk":
      return `WHR ${whr} — moderate cardiovascular risk. Monitor waist circumference and diet.`;
    case "High Risk":
      return `WHR ${whr} — high cardiovascular risk. Lifestyle modifications recommended.`;
    case "Very High Risk":
      return `WHR ${whr} — very high cardiovascular risk. Medical consultation strongly advised.`;
  }
}

export function getWHRRiskBadgeClass(risk: WHRRiskLevel): string {
  switch (risk) {
    case "Low Risk":      return "bg-green-100 text-green-800 border-green-200";
    case "Moderate Risk": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "High Risk":     return "bg-orange-100 text-orange-800 border-orange-200";
    case "Very High Risk":return "bg-red-100 text-red-800 border-red-200";
  }
}
