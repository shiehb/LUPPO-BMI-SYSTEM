"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Edit3, FileCheck, RotateCcw } from "lucide-react";
import { submitAssessment } from "./actions";
import type { Assessment } from "@/lib/types";
import { getBMIStatusColor, getPNPStatusColor } from "@/lib/bmi";
import type { BMIStatus, PNPStatus } from "@/lib/bmi";
import { getWHRRisk } from "@/lib/utils/hip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { cn } from "@/lib/utils";

export function AssessmentReview({
  assessment,
  gender,
}: {
  assessment: Assessment;
  gender?: "Male" | "Female" | null;
}) {
  const router = useRouter();
  const [certified, setCertified]       = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isComplete =
    Number(assessment.weight) > 0 &&
    Number(assessment.height) >= 0.5 &&
    Number(assessment.waist)  > 0 &&
    Number(assessment.hip)    > 0 &&
    Number(assessment.wrist)  > 0 &&
    !!assessment.photo_right_url &&
    !!assessment.photo_front_url &&
    !!assessment.photo_left_url;

  // WHR derived from stored measurements; risk requires gender
  const whr =
    assessment.waist != null && assessment.hip != null
      ? assessment.waist / assessment.hip
      : null;
  const whrRisk =
    whr !== null && gender ? getWHRRisk(whr, gender) : null;

  const hasBMI = Number(assessment.bmi_score) > 0;

  async function handleConfirmSubmit() {
    setIsSubmitting(true);
    const result = await submitAssessment(assessment.id);
    setIsSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Assessment submitted for approval.");
    setDialogOpen(false);
    router.refresh();
  }

  const photoViews = [
    { label: "Right", url: assessment.photo_right_url },
    { label: "Front", url: assessment.photo_front_url },
    { label: "Left",  url: assessment.photo_left_url  },
  ] as { label: string; url: string | null }[];

  const circumferences = [
    { label: "Waist", key: "waist" as const },
    { label: "Hip",   key: "hip"   as const },
    { label: "Wrist", key: "wrist" as const },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Returned-by-admin banner */}
      {assessment.status === "returned" && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <RotateCcw className="mt-0.5 size-4 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              Returned for Correction
            </p>
            {assessment.rejection_reason && (
              <p className="mt-0.5 text-xs text-red-700">
                <span className="font-medium">Reason: </span>
                {assessment.rejection_reason}
              </p>
            )}
            <p className="mt-1 text-xs text-red-700">
              Please edit your measurements and re-submit for approval.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Review Assessment</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review your results carefully before submitting for Admin approval.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => router.push(`/dashboard/my-profile/${assessment.id}/edit`)}
        >
          <Edit3 className="size-3.5" />
          Edit
        </Button>
      </div>

      {/* Measurements + BMI Summary card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Measurements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <p className="w-2/5 shrink-0 text-sm text-muted-foreground">Weight (kg)</p>
              <p className="w-3/5 font-medium">{assessment.weight ?? "—"}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="w-2/5 shrink-0 text-sm text-muted-foreground">Height (cm)</p>
              <p className="w-3/5 font-medium">
                {assessment.height
                  ? (Number(assessment.height) * 100).toFixed(0)
                  : "—"}
              </p>
            </div>
          </div>

          <Separator />

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Circumference (cm)
          </p>
          <div className="space-y-3">
            {circumferences.map(({ label, key }) => (
              <div key={key} className="flex items-center gap-3">
                <p className="w-2/5 shrink-0 text-sm text-muted-foreground">{label} (cm)</p>
                <p className="w-3/5 font-medium">
                  {assessment[key] != null
                    ? assessment[key]
                    : <span className="text-muted-foreground">—</span>}
                </p>
              </div>
            ))}
          </div>

          {/* BMI summary — mirrors the form's live preview panel */}
          {hasBMI && (
            <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">BMI Score</span>
                <span className="text-2xl font-bold">
                  {Number(assessment.bmi_score).toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">WHO Standard</span>
                  <Badge
                    variant="outline"
                    className={getBMIStatusColor(assessment.bmi_who_status as BMIStatus)}
                  >
                    {assessment.bmi_who_status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">PNP Standard</span>
                  <Badge
                    variant="outline"
                    className={getPNPStatusColor(assessment.bmi_pnp_status as PNPStatus)}
                  >
                    {assessment.bmi_pnp_status}
                  </Badge>
                </div>
                {assessment.frame_size && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Frame Size</span>
                    <span className="font-medium">{assessment.frame_size}</span>
                  </div>
                )}
                {whr !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">WHR</span>
                    <span className="font-medium">
                      {whr.toFixed(3)}
                      {whrRisk && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({whrRisk})
                        </span>
                      )}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Normal Weight Range</span>
                  <span className="font-medium">
                    {assessment.normal_weight_min}–{assessment.normal_weight_max} kg
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Weight to Lose</span>
                  <span className={cn(
                    "font-semibold",
                    Number(assessment.weight_to_lose) > 0 ? "text-orange-600" : "text-green-600"
                  )}>
                    {Number(assessment.weight_to_lose) > 0
                      ? `${assessment.weight_to_lose} kg`
                      : "Maintain"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3-View Photos card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">3-View Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {photoViews.map(({ label, url }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <p className="text-center text-xs font-medium text-muted-foreground">
                  {label} View
                </p>
                {url ? (
                  <div className="aspect-square overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${label} view`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                    Not uploaded
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Incomplete warning */}
      {!isComplete && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your assessment is incomplete. Go back and fill in all measurements
          and upload all 3 photos before you can submit.
        </div>
      )}

      {/* Certification checkbox */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5">
          <label className="flex cursor-pointer select-none items-start gap-3">
            <input
              type="checkbox"
              checked={certified}
              onChange={(e) => setCertified(e.target.checked)}
              disabled={!isComplete}
              className="mt-0.5 size-5 sm:size-4 cursor-pointer rounded border-gray-300 accent-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className="text-sm leading-relaxed">
              I certify that the measurements and photos provided are accurate
              and my own. I understand that submitting false information may
              result in disciplinary action.
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          className="flex-1 sm:flex-none sm:w-auto"
          onClick={() => router.push("/dashboard/my-profile")}
        >
          Continue Later
        </Button>
        <Button
          className="flex-1 sm:flex-none sm:w-auto"
          disabled={!isComplete || !certified}
          onClick={() => setDialogOpen(true)}
        >
          <FileCheck className="mr-2 size-4" />
          Submit for Approval
        </Button>
      </div>

      <ConfirmationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Confirm Submission?"
        description="Once submitted, you cannot edit your results until an Admin reviews them."
        confirmLabel="Submit for Approval"
        isPending={isSubmitting}
        onConfirm={handleConfirmSubmit}
      />
    </div>
  );
}
