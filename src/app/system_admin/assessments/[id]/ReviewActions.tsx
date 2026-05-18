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
  const [returnOpen, setReturnOpen]       = useState(false);
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
      router.push("/dashboard/personnel");
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
      router.push("/dashboard/personnel");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to allow edit.");
    } finally {
      setIsAllowingEdit(false);
    }
  }

  async function handleReturn() {
    setIsReturning(true);
    try {
      const result = await updateAssessmentStatus(assessmentId, "returned", adminRemarks.trim());
      if (result.error) { toast.error(result.error); return; }
      toast.success("Assessment returned.");
      setReturnOpen(false);
      router.push("/dashboard/personnel");
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
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <FilePen className="size-3.5 shrink-0" />
            Officer requested to edit this submission.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-400/60 text-amber-700 hover:bg-amber-100"
            onClick={() => setAllowEditOpen(true)}
          >
            Allow Edit
          </Button>
        </div>
      )}

      {/* Return reason form — expands above the action bar */}
      {showReturnForm && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 space-y-3">
          <p className="text-sm font-medium text-red-800">Reason for Return *</p>
          <Textarea
            value={adminRemarks}
            onChange={(e) => setAdminRemarks(e.target.value)}
            placeholder="Describe what the officer needs to correct before resubmitting…"
            rows={3}
          />
        </div>
      )}

      {/* Bottom action bar — horizontal, mirrors user form's action row */}
      <div className="flex items-center justify-end gap-3">
        {!showReturnForm ? (
          <Button
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => setShowReturnForm(true)}
          >
            <RotateCcw className="mr-2 size-4" />
            Return
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={() => { setShowReturnForm(false); setAdminRemarks(""); }}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={!adminRemarks.trim()}
              onClick={() => {
                if (!adminRemarks.trim()) {
                  toast.error("Please enter a reason so the officer knows what to fix.");
                  return;
                }
                setReturnOpen(true);
              }}
            >
              Return
            </Button>
          </>
        )}

        {!showReturnForm && (
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setApproveOpen(true)}
          >
            <CheckCircle2 className="mr-2 size-4" />
            Approve
          </Button>
        )}
      </div>

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
        open={returnOpen}
        onOpenChange={setReturnOpen}
        title="Return?"
        description="The officer will be notified and asked to revise their submission based on your reason."
        confirmLabel="Confirm Return"
        variant="destructive"
        isPending={isReturning}
        onConfirm={handleReturn}
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
