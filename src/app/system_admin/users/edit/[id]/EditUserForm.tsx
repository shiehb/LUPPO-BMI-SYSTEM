"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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
import { updateUser } from "../../actions";
import type { UpdateUserPayload } from "../../actions";
import { fetchRankNames, fetchUnitNames } from "@/app/system_admin/settings/actions";
import { NAME_QUALIFIERS, MAX_BIRTHDATE, MIN_BIRTHDATE } from "@/lib/constants";
import type { Profile } from "@/lib/types";

// ── Schema (mirrors UserFormDialog) ──────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function Required() {
  return <span className="text-destructive" aria-hidden>*</span>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EditUserForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pendingPayload, setPendingPayload] = useState<UpdateUserPayload | null>(null);
  const [confirmOpen,   setConfirmOpen]   = useState(false);
  const [isConfirming,  setIsConfirming]  = useState(false);
  const [rankOptions,   setRankOptions]   = useState<string[]>([]);
  const [unitOptions,   setUnitOptions]   = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      last_name:    profile.last_name    ?? "",
      first_name:   profile.first_name   ?? "",
      middle_name:  profile.middle_name  ?? "",
      qualifier:    profile.qualifier    ?? "",
      gender:       profile.gender       ?? "",
      birthdate:    profile.birthdate    ?? "",
      rank:         profile.rank         ?? "",
      unit_station: profile.unit_station ?? "",
      role:         profile.role         ?? "user",
    },
  });

  const { formState: { errors, isSubmitting } } = form;

  useEffect(() => {
    fetchRankNames().then(setRankOptions).catch(() => {});
    fetchUnitNames().then(setUnitOptions).catch(() => {});
  }, []);

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

  async function handleConfirmUpdate() {
    if (!pendingPayload) return;
    setIsConfirming(true);
    const result = await updateUser(profile.id, pendingPayload);
    setIsConfirming(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success("User updated successfully.");
    setConfirmOpen(false);
    router.push("/dashboard/sys-admin/users");
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">

      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/dashboard/sys-admin/users">
          <ArrowLeft className="size-4 mr-1" />
          Back to Users
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Edit User</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update officer profile details. Badge number and email cannot be changed.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* ── Personal Information ─────────────────────────────────────────── */}
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Personal Information
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="uf-last-name">Last Name <Required /></Label>
              <Input id="uf-last-name" placeholder="DELA CRUZ" {...uppercaseRegister(form.register, "last_name")} />
              <FieldError message={errors.last_name?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uf-first-name">First Name <Required /></Label>
              <Input id="uf-first-name" placeholder="JUAN" {...uppercaseRegister(form.register, "first_name")} />
              <FieldError message={errors.first_name?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uf-middle-name">Middle Name</Label>
              <Input id="uf-middle-name" placeholder="SANTOS" {...uppercaseRegister(form.register, "middle_name")} />
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

        {/* ── Service Information ──────────────────────────────────────────── */}
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Service Information
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="uf-badge">Badge Number</Label>
              <Input
                id="uf-badge"
                value={profile.badge_number}
                readOnly
                className="cursor-not-allowed bg-muted opacity-70 font-mono"
              />
              <p className="text-xs text-muted-foreground">Badge number cannot be changed.</p>
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

        {/* ── Account ──────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Account
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="uf-email">Email</Label>
              <Input
                id="uf-email"
                type="email"
                value={profile.email}
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

        {/* ── Bottom action bar ────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/dashboard/sys-admin/users")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Validating…" : "Save Changes"}
          </Button>
        </div>
      </form>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Update User Information?"
        description="This will modify the officer's profile data."
        confirmLabel="Save Changes"
        isPending={isConfirming}
        onConfirm={handleConfirmUpdate}
      />
    </div>
  );
}
