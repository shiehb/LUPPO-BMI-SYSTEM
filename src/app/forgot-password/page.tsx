"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, ShieldCheck, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [badgeNumber, setBadgeNumber] = useState("");
  const [message, setMessage]         = useState("");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  async function handleReset(e: React.FormEvent) {
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
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <ShieldCheck size={24} className="text-[#1a3a8a]" />
          <div className="text-center">
            <p className="font-bold text-sm text-[#1a3a8a]">LUPPO BMI SYSTEM</p>
            <p className="text-xs text-gray-500">La Union Police Provincial Office</p>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your badge number and we&apos;ll send a reset link to the email on file.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="badge" className="text-sm font-medium leading-none">Badge Number</label>
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
                    className="pl-9"
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

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1a3a8a] hover:bg-[#122d6e]"
              >
                {loading ? "Sending…" : "Send Reset Link"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-0">
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
