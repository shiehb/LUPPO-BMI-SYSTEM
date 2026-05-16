"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, FilePen, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { allowEditRequest, updateAssessmentStatus } from "../actions";

interface ReviewActionsProps {
  assessmentId: string;
  editRequested: boolean;
}

export function ReviewActions({ assessmentId, editRequested }: ReviewActionsProps) {
  const router = useRouter();
  const [approveOpen, setApproveOpen]     = useState(false);
  const [allowEditOpen, setAllowEditOpen] = useState(false);
  const [isApproving, setIsApproving]     = useState(false);
  const [isAllowingEdit, setIsAllowingEdit] = useState(false);
  const [isReturning, setIsReturning]     = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [adminRemarks, setAdminRemarks]   = useState("");

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

  async function handleAllowEdit() {
    setIsAllowingEdit(true);
    try {
      const result = await allowEditRequest(assessmentId);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Edit approved. The officer can now revise their submission.");
      setAllowEditOpen(false);
      router.push("/system_admin/assessments");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to allow edit.");
    } finally {
      setIsAllowingEdit(false);
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
      {/* Edit request alert — shown only when officer has requested to edit */}
      {editRequested && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2.5">
          <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <FilePen className="size-3.5 shrink-0" />
            Officer requested to edit this submission.
          </p>
          <Button
            variant="outline"
            className="w-full border-amber-400/60 text-amber-700 hover:bg-amber-100"
            onClick={() => setAllowEditOpen(true)}
          >
            Allow Edit
          </Button>
        </div>
      )}

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

      <ConfirmationDialog
        open={allowEditOpen}
        onOpenChange={setAllowEditOpen}
        title="Allow Edit Request?"
        description="This will move the assessment back to Draft. The officer will be able to revise and resubmit."
        confirmLabel="Allow Edit"
        isPending={isAllowingEdit}
        onConfirm={handleAllowEdit}
      />
    </div>
  );
}
