import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, History, Plus, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Assessment, AssessmentStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getWHOBadgeClass } from "@/lib/utils/bmi";
import { getPNPBadgeClass } from "@/lib/utils/pnp";
import type { WHOCategory } from "@/lib/utils/bmi";
import type { PNPClassification } from "@/lib/utils/pnp";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusLabel(s: AssessmentStatus) {
  return { draft: "Draft", pending_approval: "Pending", approved: "Approved", rejected: "Rejected" }[s];
}

function statusBadgeClass(s: AssessmentStatus) {
  return {
    draft:            "bg-gray-100 text-gray-700 border-gray-200",
    pending_approval: "bg-amber-100 text-amber-800 border-amber-200",
    approved:         "bg-green-100 text-green-800 border-green-200",
    rejected:         "bg-red-100 text-red-800 border-red-200",
  }[s];
}

export default async function AssessmentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = getAdminClient();
  const { data: raw } = await admin
    .from("bmi_assessments")
    .select("*")
    .eq("user_id", user.id)
    .order("date_taken", { ascending: false });

  const assessments = (raw ?? []) as Assessment[];
  const latest      = assessments[0] ?? null;
  const hasPending  = assessments.some((a) => a.status === "pending_approval");
  const hasDraft    = assessments.some((a) => a.status === "draft");

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Assessments</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track your BMI history and submit monthly assessments for review.
          </p>
        </div>

        {hasPending ? (
          <Button disabled className="gap-2 shrink-0">
            <Clock className="size-4" />
            Pending Review
          </Button>
        ) : (
          <Button asChild className="gap-2 shrink-0">
            <Link href="/user/assessment/new">
              <Plus className="size-4" />
              {hasDraft ? "Continue Draft" : "New Assessment"}
            </Link>
          </Button>
        )}
      </div>

      {/* ── Pending banner ── */}
      {hasPending && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Assessment Pending Admin Approval
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              Your latest submission is under review. You cannot create a new
              assessment until it is approved or rejected.
            </p>
          </div>
        </div>
      )}

      {/* ── Latest Status Card ── */}
      {latest && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              Latest Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* BMI score */}
              <div className="flex flex-col items-center justify-center rounded-xl bg-muted/50 px-8 py-4 text-center shrink-0">
                <span className="text-4xl font-bold tabular-nums tracking-tight">
                  {Number(latest.bmi_score).toFixed(2)}
                </span>
                <span className="mt-0.5 text-xs text-muted-foreground">BMI Score</span>
              </div>

              <Separator orientation="vertical" className="hidden sm:block self-stretch" />

              {/* Details */}
              <div className="flex-1 space-y-3">
                {/* Badges row */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={cn("font-semibold", getWHOBadgeClass(latest.bmi_who_status as WHOCategory))}
                  >
                    {latest.bmi_who_status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("font-semibold", getPNPBadgeClass(latest.bmi_pnp_status as PNPClassification))}
                  >
                    PNP: {latest.bmi_pnp_status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", statusBadgeClass(latest.status))}
                  >
                    {statusLabel(latest.status)}
                  </Badge>
                </div>

                {/* Stats grid */}
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-medium">{fmtDate(latest.date_taken)}</dd>
                  <dt className="text-muted-foreground">Weight</dt>
                  <dd className="font-medium">{latest.weight} kg</dd>
                  <dt className="text-muted-foreground">Height</dt>
                  <dd className="font-medium">{latest.height} m</dd>
                  {Number(latest.weight_to_lose) > 0 && (
                    <>
                      <dt className="text-muted-foreground">Weight to Lose</dt>
                      <dd className="font-semibold text-orange-600">
                        {latest.weight_to_lose} kg
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── History Table ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4 text-primary" />
            Assessment History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {assessments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="mb-3 rounded-full bg-muted p-4">
                <TrendingUp className="size-6 text-muted-foreground" />
              </div>
              <p className="font-medium">No assessments yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Submit your first assessment to start tracking your BMI history.
              </p>
              <Button asChild className="mt-4 gap-2">
                <Link href="/user/assessment/new">
                  <Plus className="size-4" />
                  Create First Assessment
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Weight (kg)</TableHead>
                    <TableHead className="text-right">Height (m)</TableHead>
                    <TableHead className="text-right">BMI</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {fmtDate(a.date_taken)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{a.weight}</TableCell>
                      <TableCell className="text-right tabular-nums">{a.height}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {Number(a.bmi_score).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", getWHOBadgeClass(a.bmi_who_status as WHOCategory))}
                        >
                          {a.bmi_who_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", statusBadgeClass(a.status))}
                        >
                          {statusLabel(a.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
