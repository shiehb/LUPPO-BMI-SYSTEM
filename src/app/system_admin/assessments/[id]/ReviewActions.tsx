"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { updateAssessmentStatus } from "../actions";

export function ReviewActions({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [approveOpen, setApproveOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [adminRemarks, setAdminRemarks] = useState("");

  async function handleApprove() {
    setIsApproving(true);
    try {
      const result = await updateAssessmentStatus(assessmentId, "approved");
      if (result.error) { toast.error(result.error); return; }
      toast.success("Assessment approved successfully.");
      setApproveOpen(false);
      router.push("/system_admin/assessments");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve.");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReturn() {
    if (!adminRemarks.trim()) {
      toast.error("Please enter remarks so the officer knows what to fix.");
      return;
    }
    setIsReturning(true);
    try {
      const result = await updateAssessmentStatus(assessmentId, "revision_required", adminRemarks.trim());
      if (result.error) { toast.error(result.error); return; }
      toast.success("Assessment returned for revision.");
      router.push("/system_admin/assessments");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to return assessment.");
    } finally {
      setIsReturning(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        className="w-full bg-green-600 hover:bg-green-700"
        onClick={() => setApproveOpen(true)}
      >
        <CheckCircle2 className="mr-2 size-4" />
        Approve
      </Button>

      {!showReturnForm ? (
        <Button
          variant="outline"
          className="w-full border-amber-400/50 text-amber-700 hover:bg-amber-50"
          onClick={() => setShowReturnForm(true)}
        >
          <RotateCcw className="mr-2 size-4" />
          Return for Revision
        </Button>
      ) : (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800">Admin Remarks *</p>
          <Textarea
            value={adminRemarks}
            onChange={(e) => setAdminRemarks(e.target.value)}
            placeholder="Describe what the officer needs to correct before resubmitting…"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              disabled={isReturning || !adminRemarks.trim()}
              onClick={handleReturn}
            >
              {isReturning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Return for Revision"
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setShowReturnForm(false); setAdminRemarks(""); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve Assessment?"
        description="This will mark the officer's BMI submission as approved. This action cannot be undone."
        confirmLabel="Approve"
        isPending={isApproving}
        onConfirm={handleApprove}
      />
    </div>
  );
}
