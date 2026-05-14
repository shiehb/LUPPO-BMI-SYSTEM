"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { updateAssessmentStatus } from "../actions";

export function ReviewActions({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [approveOpen, setApproveOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

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

  async function handleReject() {
    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason.");
      return;
    }
    setIsRejecting(true);
    try {
      const result = await updateAssessmentStatus(assessmentId, "rejected", rejectionReason.trim());
      if (result.error) { toast.error(result.error); return; }
      toast.success("Assessment rejected.");
      router.push("/system_admin/assessments");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject.");
    } finally {
      setIsRejecting(false);
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

      {!showRejectForm ? (
        <Button
          variant="outline"
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/5"
          onClick={() => setShowRejectForm(true)}
        >
          <XCircle className="mr-2 size-4" />
          Reject
        </Button>
      ) : (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <p className="text-sm font-medium text-destructive">Rejection Reason *</p>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Describe why this submission is being rejected…"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              disabled={isRejecting || !rejectionReason.trim()}
              onClick={handleReject}
            >
              {isRejecting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Submit Rejection"
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setShowRejectForm(false); setRejectionReason(""); }}
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
