"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Edit3, FileCheck } from "lucide-react";
import { submitAssessment } from "./actions";
import type { Assessment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export function AssessmentReview({
  assessment,
}: {
  assessment: Assessment;
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
    <div className="space-y-6 max-w-2xl">
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
          onClick={() => router.push("/user/assessment/new?edit=1")}
        >
          <Edit3 className="size-3.5" />
          Edit
        </Button>
      </div>

      {/* Measurements card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Measurements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Weight (kg)</p>
              <p className="font-medium">{assessment.weight ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Height (cm)</p>
              <p className="font-medium">
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
          <div className="grid gap-4 sm:grid-cols-3">
            {circumferences.map(({ label, key }) => (
              <div key={key}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium">
                  {assessment[key] != null ? assessment[key] : <span className="text-muted-foreground">—</span>}
                </p>
              </div>
            ))}
          </div>
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
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 accent-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className="text-sm leading-relaxed">
              I certify that the measurements and photos provided are accurate
              and my own. I understand that submitting false information may
              result in disciplinary action.
            </span>
          </label>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        disabled={!isComplete || !certified}
        onClick={() => setDialogOpen(true)}
      >
        <FileCheck className="mr-2 size-4" />
        Submit for Approval
      </Button>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => router.push("/user/assessment")}
      >
        Continue Later
      </Button>

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
