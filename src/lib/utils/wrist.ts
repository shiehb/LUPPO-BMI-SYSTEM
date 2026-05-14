// Frame size determined by height-to-wrist circumference ratio
// Formula: Height(cm) / Wrist(cm)
export type BodyFrame = "Small" | "Medium" | "Large";

export function getBodyFrame(
  heightCm: number,
  wristCm: number,
  gender: "Male" | "Female"
): BodyFrame {
  const ratio = heightCm / wristCm;
  if (gender === "Male") {
    if (ratio > 10.4) return "Small";
    if (ratio >= 9.6)  return "Medium";
    return "Large";
  } else {
    if (ratio > 11.0) return "Small";
    if (ratio >= 10.1) return "Medium";
    return "Large";
  }
}

export function getFrameSizeDescription(frame: BodyFrame): string {
  switch (frame) {
    case "Small":
      return "Small bone structure. Ideal weight ranges may be slightly lower.";
    case "Medium":
      return "Average bone structure. Standard weight ranges apply.";
    case "Large":
      return "Large bone structure. Higher body weight may still be within healthy limits.";
  }
}

export function getFrameBadgeClass(frame: BodyFrame): string {
  switch (frame) {
    case "Small":  return "bg-blue-100 text-blue-800 border-blue-200";
    case "Medium": return "bg-gray-100 text-gray-800 border-gray-200";
    case "Large":  return "bg-purple-100 text-purple-800 border-purple-200";
  }
}
