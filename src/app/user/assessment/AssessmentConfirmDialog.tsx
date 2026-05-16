"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AssessmentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function AssessmentConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: AssessmentConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Assessment Submission</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>
              Are you sure you want to create and submit your BMI assessment? You are only allowed to create 1 assessment for each month. Please make sure your weight, height, and side-view photos are completely accurate before proceeding.
            </p>
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
              <p className="font-semibold mb-1">⚠️ Important Reminder:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>This action cannot be easily undone for the current month</li>
                <li>Ensure all measurements are accurate before submission</li>
                <li>Photos must clearly show your physique from all angles</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? "Submitting..." : "Confirm & Submit"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
