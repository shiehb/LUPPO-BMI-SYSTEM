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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { usePersonnelStore } from "@/store/personnelStore";
import { updateAssessmentStatus } from "../personnel/actions";
import { getPNPStatusColor } from "@/lib/bmi";
import type { PNPStatus } from "@/lib/bmi";
import type { PersonnelRecord } from "@/lib/types";

interface ReviewModalProps {
  record: PersonnelRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

export function ReviewModal({ record, open, onOpenChange }: ReviewModalProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const optimisticallyApprove = usePersonnelStore((s) => s.optimisticallyApprove);
  const optimisticallyReject = usePersonnelStore((s) => s.optimisticallyReject);

  function resetAndClose() {
    setShowRejectForm(false);
    setRejectionReason("");
    onOpenChange(false);
  }

  function handleApprove() {
    if (!record?.assessment) return;
    optimisticallyApprove(record.assessment.id);
    resetAndClose();
    startTransition(async () => {
      const { error } = await updateAssessmentStatus(record.assessment!.id, "approved");
      if (error) toast.error(`Approval failed: ${error}`);
      else toast.success(`${record.profile.full_name}'s assessment approved.`);
    });
  }

  function handleReject() {
    if (!record?.assessment) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    optimisticallyReject(record.assessment.id, rejectionReason.trim());
    resetAndClose();
    startTransition(async () => {
      const { error } = await updateAssessmentStatus(
        record.assessment!.id,
        "rejected",
        rejectionReason.trim()
      );
      if (error) toast.error(`Rejection failed: ${error}`);
      else toast.success(`${record.profile.full_name}'s assessment rejected.`);
    });
  }

  if (!record) return null;

  const { profile, assessment, status } = record;
  const isPendingStatus = status === "pending_approval";

  const age =
    profile.birthdate
      ? Math.floor(
          (Date.now() - new Date(profile.birthdate).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
      : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isPendingStatus ? "Review Assessment" : "Assessment Details"}
          </DialogTitle>
          <DialogDescription>
            {isPendingStatus
              ? "Review the officer's full submission before making a decision."
              : "This assessment has already been reviewed."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Officer info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="col-span-2">
              <DetailRow
                label="Name"
                value={`${profile.rank ? profile.rank + " " : ""}${profile.full_name}`}
              />
            </div>
            <DetailRow label="Badge #" value={profile.badge_number} mono />
            <DetailRow label="Unit / Station" value={profile.unit_station ?? "—"} />
            {age !== null && (
              <DetailRow label="Age" value={`${age} yrs`} />
            )}
            {profile.gender && (
              <DetailRow label="Gender" value={profile.gender} />
            )}
          </div>

          {assessment && (
            <>
              <Separator />

              {/* Measurements */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                <DetailRow
                  label="Height"
                  value={`${(assessment.height * 100).toFixed(0)} cm`}
                />
                <DetailRow label="Weight" value={`${assessment.weight} kg`} />
                {assessment.waist != null && (
                  <DetailRow label="Waist" value={`${assessment.waist} cm`} />
                )}
                {assessment.wrist != null && (
                  <DetailRow label="Wrist" value={`${assessment.wrist} cm`} />
                )}
              </div>

              <Separator />

              {/* BMI + PNP Classification */}
              <div className="flex items-start gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">BMI Score</p>
                  <p className="text-3xl font-bold tabular-nums leading-none">
                    {assessment.bmi_score.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {assessment.bmi_who_status}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    PNP Classification
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-sm font-medium ${getPNPStatusColor(
                      assessment.bmi_pnp_status as PNPStatus
                    )}`}
                  >
                    {assessment.bmi_pnp_status}
                  </Badge>
                </div>
              </div>
            </>
          )}

          {/* Rejection reason form (shown only when admin clicks "Reject Submission") */}
          {showRejectForm && (
            <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <Label htmlFor="reject-reason" className="text-red-800">
                Reason for rejection <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                placeholder="e.g. Measurements appear inconsistent with prior record…"
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                disabled={isPending}
                className="bg-white"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {/* Left side: Cancel */}
          <Button variant="outline" onClick={resetAndClose} disabled={isPending}>
            Cancel
          </Button>

          {/* Right side: action buttons — only shown for pending assessments */}
          {isPendingStatus && (
            <div className="flex flex-col gap-2 sm:flex-row">
              {!showRejectForm ? (
                <>
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => setShowRejectForm(true)}
                    disabled={isPending}
                  >
                    <XCircle className="size-4 mr-1.5" />
                    Reject Submission
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    onClick={handleApprove}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4 mr-1.5" />
                    )}
                    Verify &amp; Approve
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason("");
                    }}
                    disabled={isPending}
                  >
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isPending || !rejectionReason.trim()}
                  >
                    {isPending ? (
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <XCircle className="size-4 mr-1.5" />
                    )}
                    Confirm Rejection
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
