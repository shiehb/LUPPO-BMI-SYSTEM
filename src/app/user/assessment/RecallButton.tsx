"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Undo2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { requestRevision } from "./actions";

export function RecallButton({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleRecall() {
    setIsPending(true);
    try {
      const result = await requestRevision(assessmentId);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Assessment recalled. You can now edit and resubmit.");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to recall assessment.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 shrink-0"
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Undo2 className="size-3.5" />
        )}
        Recall
      </Button>

      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Recall Submission?"
        description="This will move your assessment back to Draft so you can make changes. The admin will not be able to review it until you resubmit."
        confirmLabel="Recall & Edit"
        isPending={isPending}
        onConfirm={handleRecall}
      />
    </>
  );
}
