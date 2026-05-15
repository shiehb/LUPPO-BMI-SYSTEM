"use client";

import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Controls the confirm button color. Use "destructive" for irreversible/dangerous actions. */
  variant?: "default" | "destructive";
  /** When true the confirm button shows a spinner and both buttons are disabled. */
  isPending?: boolean;
  /** When true the confirm button is disabled but the cancel button remains active. */
  confirmDisabled?: boolean;
  onConfirm: () => void;
}

/**
 * Thin, reusable wrapper around AlertDialog for all "are you sure?" flows.
 * The confirm button is a plain Button (not AlertDialogAction) so it does NOT
 * auto-dismiss — the parent controls closure via onOpenChange, which lets async
 * actions show loading state and stay open on error.
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isPending = false,
  confirmDisabled = false,
  onConfirm,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>
          <Button variant={variant} onClick={onConfirm} disabled={isPending || confirmDisabled}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Processing…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
