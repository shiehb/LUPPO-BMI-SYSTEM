"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface PrintButtonProps {
  assessmentId: string;
  className?: string;
  iconClassName?: string;
}

export function PrintButton({ assessmentId, className, iconClassName }: PrintButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Printer className={iconClassName} />
        Print
      </Button>

      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Print BMI Assessment?"
        description="This will open the printable version of this BMI assessment. Confirm to proceed."
        confirmLabel="Print"
        onConfirm={() => {
          setOpen(false);
          router.push(`/print/bmi-form?id=${assessmentId}`);
        }}
      />
    </>
  );
}
