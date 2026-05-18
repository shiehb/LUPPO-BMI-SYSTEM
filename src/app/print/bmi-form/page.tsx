import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/guards";
import {
  getAssessmentForPrint,
} from "@/app/system_admin/reports/actions";
import BmiMonitoringFormPrint, {
  type PrintFormData,
} from "@/components/print/BmiMonitoringFormPrint";
import type { Assessment, Profile } from "@/lib/types";
import type { YearlyEntry, ReviewerSnippet } from "@/app/system_admin/reports/actions";

export const metadata: Metadata = {
  title: "BMI Monitoring Form – Print | LUPPO BMI System",
};

/* ── HELPERS ──────────────────────────────────────────────────────────────── */

function ageAt(birthdate: string, referenceDate: string): number {
  const ref  = new Date(`${referenceDate}T00:00:00`);
  const born = new Date(`${birthdate}T00:00:00`);
  let age = ref.getFullYear() - born.getFullYear();
  if (
    ref.getMonth() < born.getMonth() ||
    (ref.getMonth() === born.getMonth() && ref.getDate() < born.getDate())
  ) {
    age--;
  }
  return age;
}

const WHO_TO_PKG: Record<string, string> = {
  "Underweight":                   "A",
  "Normal":                        "B",
  "Overweight":                    "C",
  "Acceptable BMI by Age":         "C",
  "Acceptable BMI by Large Frame": "C",
  "At Risk (Central Obesity)":     "D",
  "Obese Class I":                 "D",
  "Obese Class II":                "D",
  "Obese Class III":               "D",
};

function buildPrintData(
  assessment: Assessment,
  profile: Profile,
  yearly: YearlyEntry[],
  reviewer: ReviewerSnippet | null
): PrintFormData {
  const monthlyWeight: (number | null)[] = new Array(12).fill(null);
  const monthlyBmi:    (number | null)[] = new Array(12).fill(null);
  for (const a of yearly) {
    const m = parseInt(a.date_taken.slice(5, 7), 10) - 1;
    if (m >= 0 && m < 12) {
      monthlyWeight[m] = a.weight;
      monthlyBmi[m]    = parseFloat(Number(a.bmi_score).toFixed(2));
    }
  }

  const age = profile.birthdate
    ? ageAt(profile.birthdate, assessment.date_taken)
    : 0;

  const year = assessment.date_taken.slice(0, 4);

  const dateTaken = new Date(`${assessment.date_taken}T00:00:00`).toLocaleDateString(
    "en-US",
    { day: "numeric", month: "long", year: "numeric" }
  );

  const now = new Date();
  const generatedAt =
    now.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) +
    "  •  " +
    now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const pnpStatus = assessment.bmi_pnp_status ?? assessment.bmi_who_status ?? "";

  return {
    rank:                profile.rank ?? "",
    fullName:            profile.full_name.toUpperCase(),
    unitOffice:          (profile.unit_station ?? "").toUpperCase(),
    age,
    height:              `${Number(assessment.height).toFixed(2)} m`,
    weight:              `${assessment.weight} kg`,
    waist:               assessment.waist  != null ? `${assessment.waist} cm`  : "—",
    hip:                 assessment.hip    != null ? `${assessment.hip} cm`    : "—",
    wrist:               assessment.wrist  != null ? `${assessment.wrist} cm`  : "—",
    gender:              profile.gender ?? "—",
    dateTaken,
    bmiResult:           Number(assessment.bmi_score).toFixed(2),
    normalWeightRange:   `${Number(assessment.normal_weight_min).toFixed(1)} – ${Number(assessment.normal_weight_max).toFixed(1)} kg`,
    weightAction:
      assessment.weight_to_lose > 0
        ? `${assessment.weight_to_lose} kg to lose`
        : "Maintain",
    pnpClassification:   (assessment.bmi_pnp_status ?? assessment.bmi_who_status ?? "").toUpperCase(),
    bmiClassification:   (assessment.bmi_who_status ?? "").toUpperCase(),
    interventionPackage: WHO_TO_PKG[pnpStatus] ?? "—",
    photoRight:          assessment.photo_right_url,
    photoFront:          assessment.photo_front_url,
    photoLeft:           assessment.photo_left_url,
    monthlyWeight,
    monthlyBmi,
    certifiedBy: reviewer
      ? `${reviewer.rank ?? ""} ${reviewer.full_name}`.trim().toUpperCase()
      : "",
    certifiedTitle: "Chief, Health Service",
    formId:         `BMI-${year}-${profile.badge_number}`,
    generatedAt,
  };
}

/* ── PAGE ─────────────────────────────────────────────────────────────────── */

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function PrintBmiFormPage({ searchParams }: PageProps) {
  // Any authenticated user may reach this page — ownership is enforced inside
  // getAssessmentForPrint which compares assessment.user_id to the session userId.
  try {
    await requireAuth();
  } catch {
    redirect("/login");
  }

  const { id } = await searchParams;
  if (!id) redirect("/dashboard/my-profile");

  const result = await getAssessmentForPrint(id);

  if (!result.ok) {
    // 403: assessment exists but belongs to a different user
    if (result.reason === "forbidden") redirect("/unauthorized");
    // 404: assessment does not exist at all
    notFound();
  }

  const printData = buildPrintData(
    result.data.assessment,
    result.data.profile,
    result.data.yearlyAssessments,
    result.data.reviewer
  );

  return <BmiMonitoringFormPrint data={printData} />;
}
