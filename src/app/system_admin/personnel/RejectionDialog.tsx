"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { usePersonnelStore } from "@/store/personnelStore";
import { updateAssessmentStatus } from "./actions";

interface RejectionDialogProps {
  assessmentId: string;
  officerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RejectionDialog({
  assessmentId,
  officerName,
  open,
  onOpenChange,
}: RejectionDialogProps) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const optimisticallyReject = usePersonnelStore((s) => s.optimisticallyReject);

  function handleConfirm() {
    if (!reason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }

    optimisticallyReject(assessmentId, reason.trim());
    onOpenChange(false);

    startTransition(async () => {
      const { error } = await updateAssessmentStatus(assessmentId, "rejected", reason.trim());
      if (error) {
        toast.error(`Rejection failed: ${error}`);
      } else {
        toast.success(`Assessment rejected.`);
      }
      setReason("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Assessment</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting{" "}
            <span className="font-semibold">{officerName}</span>&apos;s
            assessment. They will be able to edit and re-submit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="rejection-reason">Reason for rejection</Label>
          <Textarea
            id="rejection-reason"
            placeholder="e.g. Measurements appear inconsistent with prior record…"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isPending}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || !reason.trim()}
          >
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
