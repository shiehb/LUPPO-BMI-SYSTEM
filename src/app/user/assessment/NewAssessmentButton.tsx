"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssessmentConfirmDialog } from "./AssessmentConfirmDialog";
import { checkMonthlyAssessmentExists } from "@/app/system_admin/assessments/assessment-window-actions";

interface NewAssessmentButtonProps {
  userId: string;
  hasDraft?: boolean;
  draftId?: string;
  submissionWindowStartDate?: string;
  submissionWindowEndDate?: string;
}

export function NewAssessmentButton({
  userId,
  hasDraft,
  draftId,
  submissionWindowStartDate,
}: NewAssessmentButtonProps) {
  const [hasMonthlyAssessment, setHasMonthlyAssessment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowStart = submissionWindowStartDate
    ? new Date(`${submissionWindowStartDate}T00:00:00`)
    : null;
  if (windowStart) windowStart.setHours(0, 0, 0, 0);

  const isWindowNotStarted = windowStart ? today.getTime() < windowStart.getTime() : false;
  const windowOpensOn = windowStart
    ? windowStart.toLocaleDateString("en-PH", {
        month: "long",
        day:   "numeric",
        year:  "numeric",
      })
    : null;

  useEffect(() => {
    async function checkMonthly() {
      try {
        const result = await checkMonthlyAssessmentExists(userId);
        setHasMonthlyAssessment(result.hasExisting);
      } catch (error) {
        console.error("Failed to check monthly assessment:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkMonthly();
  }, [userId]);

  const currentMonth = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  if (isLoading) {
    return (
      <Button disabled className="gap-2 shrink-0">
        <Plus className="size-4" />
        Loading...
      </Button>
    );
  }

  // Monthly assessment already exists
  if (hasMonthlyAssessment && !hasDraft) {
    return (
      <Badge variant="outline" className="gap-2 shrink-0 px-3 py-2 text-sm">
        <Lock className="size-4" />
        {currentMonth} Assessment Completed
      </Badge>
    );
  }

  // Has draft — show "Continue Draft" button
  if (hasDraft && draftId) {
    return (
      <Button asChild className="gap-2 shrink-0">
        <Link href={`/user/assessment/review/${draftId}`}>
          <Plus className="size-4" />
          Continue Draft
        </Link>
      </Button>
    );
  }

  // Eligible for new assessment — show button with confirmation
  return (
    <>
      <div className="flex flex-col gap-2">
        <Button
          onClick={() => setConfirmOpen(true)}
          className="gap-2 shrink-0"
          disabled={isWindowNotStarted}
        >
          <Plus className="size-4" />
          New Assessment
        </Button>

        {isWindowNotStarted && windowOpensOn ? (
          <p className="text-sm text-amber-700">
            Submission window opens on {windowOpensOn}.
          </p>
        ) : null}
      </div>

      <AssessmentConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => {
          setConfirmOpen(false);
          // Navigate to add page after confirmation
          window.location.href = "/user/assessment/add";
        }}
      />
    </>
  );
}
