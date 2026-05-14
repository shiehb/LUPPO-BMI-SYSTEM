export type WHOCategory =
  | "Underweight"
  | "Normal"
  | "Overweight"
  | "Obese Class I"
  | "Obese Class II"
  | "Obese Class III";

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

export function getWHOBadgeClass(category: WHOCategory): string {
  switch (category) {
    case "Normal":         return "bg-green-100 text-green-800 border-green-200";
    case "Underweight":    return "bg-blue-100 text-blue-800 border-blue-200";
    case "Overweight":     return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Obese Class I":  return "bg-orange-100 text-orange-800 border-orange-200";
    case "Obese Class II": return "bg-red-100 text-red-800 border-red-200";
    case "Obese Class III":return "bg-red-200 text-red-900 border-red-300";
    default:               return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

// Legacy text-color helper kept for existing callers
export function getBMIStatusColor(category: WHOCategory): string {
  switch (category) {
    case "Normal":         return "text-green-600";
    case "Underweight":    return "text-blue-600";
    case "Overweight":     return "text-yellow-600";
    case "Obese Class I":  return "text-orange-600";
    case "Obese Class II": return "text-red-600";
    case "Obese Class III":return "text-red-800";
    default:               return "text-gray-600";
  }
}

export function getHealthRecommendation(category: WHOCategory): string {
  switch (category) {
    case "Underweight":
      return "You are below the healthy weight range. Consult a nutritionist to develop a balanced meal plan and safely gain weight.";
    case "Normal":
      return "You are within the healthy weight range. Maintain your current lifestyle with regular exercise and a balanced diet.";
    case "Overweight":
      return "You are slightly above the healthy weight range. Increase physical activity and reduce caloric intake. A structured fitness program is recommended.";
    case "Obese Class I":
      return "Obesity Class I detected. A supervised diet and exercise program is recommended. Consider consulting a physician for a comprehensive health evaluation.";
    case "Obese Class II":
      return "Obesity Class II detected. Medical supervision is strongly advised. Significant lifestyle changes, including diet modification and regular physical activity, are required.";
    case "Obese Class III":
      return "Severe obesity detected. Immediate medical intervention is recommended. Please consult a healthcare professional for a specialized weight management program.";
    default:
      return "Consult a healthcare professional for personalized advice.";
  }
}
