"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

const schema = z.object({
  badge_number: z
    .string()
    .min(1, "Badge number is required")
    .regex(/^[^a-zA-Z]+$/, "Badge number must not contain letters"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { badge_number: "", password: "" },
  });

  const { formState: { errors, isSubmitting } } = form;

  const { onChange: rhfBadgeOnChange, ...badgeRegisterRest } =
    form.register("badge_number");

  function handleBadgeChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.target.value = e.target.value.replace(/[a-zA-Z]/g, "");
    rhfBadgeOnChange(e);
  }

  async function onSubmit(values: FormValues) {
    const supabase = createClient();

    const { data: email, error: rpcError } = await supabase.rpc("get_email_by_badge", {
      p_badge: values.badge_number,
    });

    if (rpcError || !email) {
      form.reset();
      toast.error("Badge Number not found. Please check and try again.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: values.password,
    });

    if (signInError) {
      form.resetField("password");
      toast.error("Incorrect password. Please try again.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .maybeSingle();

    const role = profile?.role;
    if (role === "system_admin") router.push("/dashboard/personnel");
    else if (role === "admin") router.push("/dashboard/personnel");
    else router.push("/dashboard/my-profile");
  }

  return (
    <CardContent>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="badge_number">Badge Number</FieldLabel>
            <Input
              id="badge_number"
              type="text"
              inputMode="numeric"
              placeholder="Enter your badge number"
              autoComplete="username"
              className="h-11"
              onChange={handleBadgeChange}
              {...badgeRegisterRest}
            />
            <FieldError errors={[errors.badge_number]} />
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="h-11 pr-10"
                {...form.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            <FieldError errors={[errors.password]} />
          </Field>

          <Field>
            <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign In"}
            </Button>
          </Field>

          <Field>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="underline underline-offset-4 hover:text-primary"
              >
                Create account
              </Link>
            </p>
          </Field>
        </FieldGroup>
      </form>
    </CardContent>
  );
}
