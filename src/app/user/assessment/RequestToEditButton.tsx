"use client";

import { useState } from "react";
import { Check, FileEdit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestEdit } from "./actions";

interface RequestToEditButtonProps {
  assessmentId: string;
  initialRequested: boolean;
}

export function RequestToEditButton({ assessmentId, initialRequested }: RequestToEditButtonProps) {
  const [status, setStatus] = useState<"idle" | "pending" | "sent">(
    initialRequested ? "sent" : "idle"
  );

  async function handleRequest() {
    if (status !== "idle") return;
    setStatus("pending");

    const result = await requestEdit(assessmentId);

    if (result.error) {
      toast.error(result.error);
      setStatus("idle");
      return;
    }

    toast.info("Edit request sent to System Admin.");
    setStatus("sent");
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 shrink-0 disabled:opacity-60"
      onClick={handleRequest}
      disabled={status !== "idle"}
    >
      {status === "pending" ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : status === "sent" ? (
        <Check className="size-3.5" />
      ) : (
        <FileEdit className="size-3.5" />
      )}
      {status === "sent" ? "Request Sent" : "Request to Edit"}
    </Button>
  );
}
