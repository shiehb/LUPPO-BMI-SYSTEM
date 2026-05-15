"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent, CardFooter } from "@/components/ui/card";
import AuthCard from "@/components/auth-card";

export default function ForgotPasswordPage() {
  const [badgeNumber, setBadgeNumber] = useState("");
  const [message, setMessage]         = useState("");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const supabase = createClient();

    const { data: email } = await supabase.rpc("get_email_by_badge", {
      p_badge: badgeNumber,
    });

    if (!email) {
      setError("Badge number not found.");
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage(`A reset link has been sent to the email on file for badge ${badgeNumber}.`);
    }

    setLoading(false);
  }

  return (
    <AuthCard
      title="Reset Password"
      description="Enter your badge number and we'll send a reset link to the email on file."
    >
      <CardContent>
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="badge" className="text-sm font-medium leading-none">
              Badge Number
            </label>
            <div className="relative">
              <BadgeCheck
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="badge"
                type="text"
                required
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder="Enter your badge number"
                className="h-11 pl-9"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          {message && (
            <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-700">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              {message}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full h-auto py-4 px-2">
            {loading ? "Sending…" : "Send Reset Link"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="border-t-0 bg-transparent px-4 pb-4 pt-0">
        <Button asChild variant="outline" className="w-full h-auto py-4 px-2">
          <Link href="/login">
            <ArrowLeft size={15} />
            Back to Sign In
          </Link>
        </Button>
      </CardFooter>
    </AuthCard>
  );
}
