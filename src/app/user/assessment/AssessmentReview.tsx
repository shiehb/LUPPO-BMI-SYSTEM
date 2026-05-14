"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Edit3, FileCheck } from "lucide-react";
import { submitAssessment } from "./actions";
import { AssessmentDashboard } from "./AssessmentDashboard";
import type { Assessment, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export function AssessmentReview({
  assessment,
  profile,
  age,
}: {
  assessment: Assessment;
  profile: Profile;
  age: number | null;
}) {
  const router = useRouter();
  const [certified, setCertified]     = useState(false);
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      {/* Medical dashboard */}
      <AssessmentDashboard assessment={assessment} profile={profile} age={age} />

      {/* Certification checkbox */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5">
          <label className="flex cursor-pointer select-none items-start gap-3">
            <input
              type="checkbox"
              checked={certified}
              onChange={(e) => setCertified(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 accent-primary"
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
        disabled={!certified}
        onClick={() => setDialogOpen(true)}
      >
        <FileCheck className="mr-2 size-4" />
        Submit for Approval
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
