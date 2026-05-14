"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { updateUser } from "./actions";
import type { UpdateUserPayload } from "./actions";
import { fetchRankNames, fetchUnitNames } from "@/app/system_admin/settings/actions";
import { NAME_QUALIFIERS, MAX_BIRTHDATE, MIN_BIRTHDATE } from "@/lib/constants";
import type { Profile } from "@/lib/types";

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  last_name:    z.string().min(1, "Last name is required"),
  first_name:   z.string().min(1, "First name is required"),
  middle_name:  z.string().optional(),
  qualifier:    z.string().optional(),
  gender:       z.string().min(1, "Please select a gender"),
  birthdate:    z.string().min(1, "Birthdate is required"),
  rank:         z.string().min(1, "Please select a rank"),
  unit_station: z.string().min(1, "Please select a unit/station"),
  role:         z.enum(["system_admin", "admin", "user"] as const),
});

type FormValues = z.infer<typeof schema>;

// ── Uppercase input helper ────────────────────────────────────────────────────

function uppercaseRegister(
  register: ReturnType<typeof useForm<FormValues>>["register"],
  name: Parameters<ReturnType<typeof useForm<FormValues>>["register"]>[0]
) {
  const { onChange, ...rest } = register(name);
  return {
    ...rest,
    className: "uppercase",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const { selectionStart, selectionEnd } = e.target;
      e.target.value = e.target.value.toUpperCase();
      e.target.setSelectionRange(selectionStart, selectionEnd);
      return onChange(e);
    },
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Profile;
  onSuccess: () => void;
}

export function UserFormDialog({ open, onOpenChange, initialData, onSuccess }: Props) {
  const [pendingPayload, setPendingPayload] = useState<UpdateUserPayload | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [rankOptions, setRankOptions] = useState<string[]>([]);
  const [unitOptions, setUnitOptions] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      last_name:    "",
      first_name:   "",
      middle_name:  "",
      qualifier:    "",
      gender:       "",
      birthdate:    "",
      rank:         "",
      unit_station: "",
      role:         "user",
    },
  });

  const { formState: { errors, isSubmitting } } = form;

  // Fetch options once when dialog first opens
  useEffect(() => {
    if (open && rankOptions.length === 0) {
      fetchRankNames().then(setRankOptions).catch(() => {});
      fetchUnitNames().then(setUnitOptions).catch(() => {});
    }
  }, [open, rankOptions.length]);

  useEffect(() => {
    if (open) {
      form.reset({
        last_name:    initialData.last_name    ?? "",
        first_name:   initialData.first_name   ?? "",
        middle_name:  initialData.middle_name  ?? "",
        qualifier:    initialData.qualifier    ?? "",
        gender:       initialData.gender       ?? "",
        birthdate:    initialData.birthdate    ?? "",
        rank:         initialData.rank         ?? "",
        unit_station: initialData.unit_station ?? "",
        role:         initialData.role         ?? "user",
      });
      setPendingPayload(null);
    }
  }, [open, initialData, form]);

  // Step 1: validate → store payload → open confirmation
  function onSubmit(values: FormValues) {
    setPendingPayload({
      first_name:   values.first_name.toUpperCase(),
      middle_name:  values.middle_name?.toUpperCase() ?? "",
      last_name:    values.last_name.toUpperCase(),
      qualifier:    values.qualifier ?? "",
      gender:       values.gender as "Male" | "Female",
      birthdate:    values.birthdate,
      rank:         values.rank,
      unit_station: values.unit_station,
      role:         values.role,
    });
    setConfirmOpen(true);
  }

  // Step 2: confirmed → call API
  async function handleConfirmUpdate() {
    if (!pendingPayload) return;
    setIsConfirming(true);
    const result = await updateUser(initialData.id, pendingPayload);
    setIsConfirming(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("User updated successfully.");
    setConfirmOpen(false);
    setPendingPayload(null);
    onSuccess();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="max-h-[62vh] space-y-6 overflow-y-auto py-2 pr-1">

              {/* ── Personal Information ───────────────────────────────── */}
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Personal Information
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="uf-last-name">Last Name <Required /></Label>
                    <Input
                      id="uf-last-name"
                      placeholder="DELA CRUZ"
                      {...uppercaseRegister(form.register, "last_name")}
                    />
                    <FieldError message={errors.last_name?.message} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="uf-first-name">First Name <Required /></Label>
                    <Input
                      id="uf-first-name"
                      placeholder="JUAN"
                      {...uppercaseRegister(form.register, "first_name")}
                    />
                    <FieldError message={errors.first_name?.message} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="uf-middle-name">Middle Name</Label>
                    <Input
                      id="uf-middle-name"
                      placeholder="SANTOS"
                      {...uppercaseRegister(form.register, "middle_name")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Qualifier</Label>
                    <Controller
                      name="qualifier"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(v) => field.onChange(v === "_none" ? "" : v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="None (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">None</SelectItem>
                            {NAME_QUALIFIERS.map((q) => (
                              <SelectItem key={q} value={q}>{q}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Gender <Required /></Label>
                    <Controller
                      name="gender"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError message={errors.gender?.message} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="uf-birthdate">Birthdate <Required /></Label>
                    <Input
                      id="uf-birthdate"
                      type="date"
                      min={MIN_BIRTHDATE}
                      max={MAX_BIRTHDATE}
                      {...form.register("birthdate")}
                    />
                    <FieldError message={errors.birthdate?.message} />
                  </div>
                </div>
              </section>

              {/* ── Service Information ────────────────────────────────── */}
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Service Information
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Badge Number — read-only */}
                  <div className="space-y-1.5">
                    <Label htmlFor="uf-badge">Badge Number</Label>
                    <Input
                      id="uf-badge"
                      value={initialData.badge_number}
                      readOnly
                      className="cursor-not-allowed bg-muted opacity-70 font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Badge number cannot be changed.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Rank <Required /></Label>
                    <Controller
                      name="rank"
                      control={form.control}
                      render={({ field }) => (
                        <Combobox
                          options={rankOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select rank"
                          searchPlaceholder="Search rank…"
                        />
                      )}
                    />
                    <FieldError message={errors.rank?.message} />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Unit / Station <Required /></Label>
                    <Controller
                      name="unit_station"
                      control={form.control}
                      render={({ field }) => (
                        <Combobox
                          options={unitOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select unit / station"
                          searchPlaceholder="Search station…"
                        />
                      )}
                    />
                    <FieldError message={errors.unit_station?.message} />
                  </div>
                </div>
              </section>

              {/* ── Account ───────────────────────────────────────────── */}
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Account
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Email — display only */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="uf-email">Email</Label>
                    <Input
                      id="uf-email"
                      type="email"
                      value={initialData.email}
                      readOnly
                      className="cursor-not-allowed bg-muted opacity-70"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed after account creation.
                    </p>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Role <Required /></Label>
                    <Controller
                      name="role"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full sm:w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="system_admin">System Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </section>
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Validating…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Update User Information?"
        description="This will modify the officer's profile data."
        confirmLabel="Save Changes"
        isPending={isConfirming}
        onConfirm={handleConfirmUpdate}
      />
    </>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Required() {
  return <span className="text-destructive" aria-hidden>*</span>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}
