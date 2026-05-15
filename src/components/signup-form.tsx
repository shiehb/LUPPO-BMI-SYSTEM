"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchRankNames, fetchUnitNames } from "@/app/system_admin/settings/actions";
import { NAME_QUALIFIERS, MAX_BIRTHDATE, MIN_BIRTHDATE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { CardContent } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

const schema = z
  .object({
    first_name: z.string().min(1, "First name is required"),
    middle_name: z.string().optional(),
    last_name: z.string().min(1, "Last name is required"),
    qualifier: z.string().optional(),
    gender: z.enum(["Male", "Female"]).refine((v) => !!v, "Gender is required"),
    birthdate: z
      .string()
      .min(1, "Birthdate is required")
      .refine((v) => v <= MAX_BIRTHDATE, "Must be at least 18 years old")
      .refine((v) => v >= MIN_BIRTHDATE, "Must be 70 years old or younger"),
    badge_number: z
      .string()
      .min(1, "Badge number is required")
      .regex(/^\d+$/, "Badge number must contain only digits"),
    rank: z.string().min(1, "Rank is required"),
    unit_station: z.string().min(1, "Unit/Station is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type FormValues = z.infer<typeof schema>;

function buildFullName(v: FormValues) {
  return [v.first_name, v.middle_name, v.last_name, v.qualifier]
    .filter(Boolean)
    .join(" ");
}

export function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState("");
  const [rankOptions, setRankOptions] = useState<string[]>([]);
  const [unitOptions, setUnitOptions] = useState<string[]>([]);

  useEffect(() => {
    fetchRankNames().then(setRankOptions).catch(() => {});
    fetchUnitNames().then(setUnitOptions).catch(() => {});
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      qualifier: "",
      gender: undefined,
      birthdate: "",
      badge_number: "",
      rank: "",
      unit_station: "",
      email: "",
      password: "",
      confirm_password: "",
    },
  });

  const { formState: { errors, isSubmitting }, control } = form;

  async function onSubmit(values: FormValues) {
    setServerError("");
    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });

    if (signUpError) {
      setServerError(signUpError.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setServerError("Sign-up failed. Please try again.");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      first_name: values.first_name.toUpperCase(),
      middle_name: values.middle_name?.toUpperCase() || null,
      last_name: values.last_name.toUpperCase(),
      qualifier: values.qualifier || null,
      full_name: buildFullName(values).toUpperCase(),
      gender: values.gender,
      birthdate: values.birthdate,
      badge_number: values.badge_number,
      rank: values.rank,
      unit_station: values.unit_station,
      email: values.email,
      role: "user",
    });

    if (profileError) {
      setServerError(profileError.message);
      return;
    }

    router.push("/login?registered=1");
  }

  return (
    <CardContent>
      <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {/* ── Personal Information ── */}
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground -mb-2">
                Personal Information
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="first_name" className="uppercase text-xs tracking-wide">
                    First Name
                  </FieldLabel>
                  <Input
                    id="first_name"
                    type="text"
                    placeholder="FIRST NAME"
                    className="h-11 uppercase"
                    {...form.register("first_name")}
                  />
                  <FieldError errors={[errors.first_name]} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="last_name" className="uppercase text-xs tracking-wide">
                    Last Name
                  </FieldLabel>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder="LAST NAME"
                    className="h-11 uppercase"
                    {...form.register("last_name")}
                  />
                  <FieldError errors={[errors.last_name]} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="middle_name" className="uppercase text-xs tracking-wide">
                    Middle Name
                  </FieldLabel>
                  <Input
                    id="middle_name"
                    type="text"
                    placeholder="MIDDLE NAME"
                    className="h-11 uppercase"
                    {...form.register("middle_name")}
                  />
                  <FieldError errors={[errors.middle_name]} />
                </Field>

                <Field>
                  <FieldLabel className="uppercase text-xs tracking-wide">Qualifier</FieldLabel>
                  <Controller
                    control={control}
                    name="qualifier"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          {NAME_QUALIFIERS.map((q) => (
                            <SelectItem key={q} value={q}>{q}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel className="uppercase text-xs tracking-wide">Gender</FieldLabel>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[errors.gender]} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="birthdate" className="uppercase text-xs tracking-wide">
                    Birthdate
                  </FieldLabel>
                  <Input
                    id="birthdate"
                    type="date"
                    min={MIN_BIRTHDATE}
                    max={MAX_BIRTHDATE}
                    className="h-11"
                    {...form.register("birthdate")}
                  />
                  <FieldError errors={[errors.birthdate]} />
                </Field>
              </div>

              {/* ── Service Information ── */}
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground -mb-2 mt-2">
                Service Information
              </p>

              <Field>
                <FieldLabel htmlFor="badge_number" className="uppercase text-xs tracking-wide">
                  Badge Number
                </FieldLabel>
                <Input
                  id="badge_number"
                  type="number"
                  inputMode="numeric"
                  placeholder="BADGE NUMBER"
                  className="h-11"
                  {...form.register("badge_number")}
                />
                <FieldError errors={[errors.badge_number]} />
              </Field>

              <Field>
                <FieldLabel className="uppercase text-xs tracking-wide">Rank</FieldLabel>
                <Controller
                  control={control}
                  name="rank"
                  render={({ field }) => (
                    <Combobox
                      options={rankOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="SELECT RANK"
                      searchPlaceholder="Search rank…"
                      className="h-11"
                    />
                  )}
                />
                <FieldError errors={[errors.rank]} />
              </Field>

              <Field>
                <FieldLabel className="uppercase text-xs tracking-wide">Unit / Station</FieldLabel>
                <Controller
                  control={control}
                  name="unit_station"
                  render={({ field }) => (
                    <Combobox
                      options={unitOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="SELECT UNIT / STATION"
                      searchPlaceholder="Search station…"
                      className="h-11"
                    />
                  )}
                />
                <FieldError errors={[errors.unit_station]} />
              </Field>

              {/* ── Account Credentials ── */}
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground -mb-2 mt-2">
                Account Credentials
              </p>

              <Field>
                <FieldLabel htmlFor="email" className="uppercase text-xs tracking-wide">
                  Email
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="badge@luppo.gov.ph"
                  autoComplete="email"
                  className="h-11"
                  {...form.register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="password" className="uppercase text-xs tracking-wide">
                  Password
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="h-11 pr-10"
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <FieldError errors={[errors.password]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="confirm_password" className="uppercase text-xs tracking-wide">
                  Confirm Password
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className="h-11 pr-10"
                    {...form.register("confirm_password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <FieldError errors={[errors.confirm_password]} />
              </Field>

              {/* Server error */}
              {serverError && (
                <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </p>
              )}

              <Field>
                <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account…" : "Create Account"}
                </Button>
              </Field>

              <Field>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Sign in
                  </Link>
                </p>
              </Field>
            </FieldGroup>
      </form>
    </CardContent>
  );
}
