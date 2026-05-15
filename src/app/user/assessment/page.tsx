import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Clock, History, Plus, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Assessment, AssessmentStatus, Profile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { RecallButton } from "./RecallButton";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

function calculateAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusLabel(s: AssessmentStatus) {
  return {
    draft:             "Draft",
    pending_approval:  "Pending",
    approved:          "Approved",
    rejected:          "Rejected",
    revision_required: "Revision Required",
  }[s];
}

function isAssessmentComplete(a: Assessment): boolean {
  return (
    Number(a.weight) > 0 &&
    Number(a.height) >= 0.5 &&
    Number(a.waist)  > 0 &&
    Number(a.hip)    > 0 &&
    Number(a.wrist)  > 0 &&
    !!a.photo_right_url &&
    !!a.photo_front_url &&
    !!a.photo_left_url
  );
}

function statusBadgeClass(s: AssessmentStatus) {
  return {
    draft:             "bg-gray-100 text-gray-700 border-gray-200",
    pending_approval:  "bg-amber-100 text-amber-800 border-amber-200",
    approved:          "bg-green-100 text-green-800 border-green-200",
    rejected:          "bg-red-100 text-red-800 border-red-200",
    revision_required: "bg-orange-100 text-orange-800 border-orange-200",
  }[s];
}

export default async function AssessmentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = getAdminClient();
  const [profileResult, assessmentsResult] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).single(),
    admin
      .from("bmi_assessments")
      .select("*")
      .eq("user_id", user.id)
      .order("date_taken", { ascending: false }),
  ]);

  const profile     = profileResult.data as Profile | null;
  const assessments = (assessmentsResult.data ?? []) as Assessment[];
  const latest      = assessments[0] ?? null;
  const pending     = assessments.find((a) => a.status === "pending_approval") ?? null;
  const revision    = assessments.find((a) => a.status === "revision_required") ?? null;
  const hasDraft    = assessments.some((a) => a.status === "draft");
  const age         = profile?.birthdate ? calculateAge(profile.birthdate) : null;

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

        {pending ? (
          <Button disabled className="gap-2 shrink-0">
            <Clock className="size-4" />
            Pending Review
          </Button>
        ) : revision ? (
          <Button asChild className="gap-2 shrink-0 bg-orange-600 hover:bg-orange-700">
            <Link href="/user/assessment/new">
              <AlertTriangle className="size-4" />
              Edit & Resubmit
            </Link>
          </Button>
        ) : hasDraft ? (
          <Button asChild className="gap-2 shrink-0">
            <Link href="/user/assessment/new?edit=1">
              <Plus className="size-4" />
              Continue Draft
            </Link>
          </Button>
        ) : (
          <Button asChild className="gap-2 shrink-0">
            <Link href="/user/assessment/new">
              <Plus className="size-4" />
              New Assessment
            </Link>
          </Button>
        )}
      </div>

      {/* ── Pending banner with Recall button ── */}
      {pending && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              Assessment Pending Admin Approval
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              Your latest submission is under review. Recall it if you need to make changes before the admin reviews it.
            </p>
          </div>
          <RecallButton assessmentId={pending.id} />
        </div>
      )}

      {/* ── Revision Required banner ── */}
      {revision && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-orange-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-orange-800">
              Assessment Returned for Revision
            </p>
            {revision.admin_remarks && (
              <p className="mt-1 text-xs text-orange-700">
                <span className="font-medium">Admin remarks:</span>{" "}
                {revision.admin_remarks}
              </p>
            )}
            <p className="mt-1 text-xs text-orange-600">
              Please correct your assessment and resubmit.
            </p>
          </div>
        </div>
      )}

      {/* ── Latest Assessment Card ── */}
      {latest && (
        <Card>
          {/* ROW 1: Header — name/rank (left) · unit (right) */}
          <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
            <div>
              <p className="font-bold text-base uppercase tracking-wide">
                {profile?.rank ? `${profile.rank.toUpperCase()} ` : ""}
                {profile?.full_name ?? ""}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {profile?.unit_station ?? "—"}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn("text-xs shrink-0 mt-0.5", statusBadgeClass(latest.status))}
            >
              {statusLabel(latest.status)}
            </Badge>
          </div>

          <CardContent className="space-y-5 pt-5">
            {/* ROW 2: Photos (70%) + BMI Score (30%) */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Photo gallery */}
              <div className="flex-[7] grid grid-cols-3 gap-2">
                {(
                  [
                    { label: "Right", url: latest.photo_right_url },
                    { label: "Front", url: latest.photo_front_url },
                    { label: "Left",  url: latest.photo_left_url  },
                  ] as { label: string; url: string | null }[]
                ).map(({ label, url }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <p className="text-center text-xs text-muted-foreground">{label}</p>
                    {url ? (
                      <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`${label} view`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                        No photo
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* BMI score display */}
              <div className="flex-[3] flex flex-col items-center justify-center rounded-xl bg-muted/50 px-4 py-6 text-center">
                <span className="text-5xl font-bold tabular-nums tracking-tight">
                  {Number(latest.bmi_score).toFixed(2)}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">BMI Score</span>
                <Badge
                  variant="outline"
                  className={cn("mt-3 font-semibold", getWHOBadgeClass(latest.bmi_who_status as WHOCategory))}
                >
                  {latest.bmi_who_status}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* ROW 3: 50/50 — metadata (left) | classification (right) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x text-sm">

              {/* Left 50%: two-column data grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 pb-4 sm:pb-0 sm:pr-6">
                {/* Col 1: Age · Height · Weight · Gender */}
                <div className="space-y-4">
                  {age !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Age</p>
                      <p className="font-semibold">{age} yrs</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Height</p>
                    <p className="font-semibold">{(Number(latest.height) * 100).toFixed(0)} cm</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Weight</p>
                    <p className="font-semibold">{latest.weight} kg</p>
                  </div>
                  {profile?.gender && (
                    <div>
                      <p className="text-xs text-muted-foreground">Gender</p>
                      <p className="font-semibold">{profile.gender}</p>
                    </div>
                  )}
                </div>

                {/* Col 2: Date Taken · Normal Range · Weight to Lose */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Date Taken</p>
                    <p className="font-semibold">{fmtDate(latest.date_taken)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Normal Range</p>
                    <p className="font-semibold">
                      {latest.normal_weight_min}–{latest.normal_weight_max} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Weight to Lose</p>
                    <p className={cn(
                      "font-semibold",
                      latest.bmi_who_status === "Normal" ? "text-green-600" : "text-orange-600"
                    )}>
                      {latest.bmi_who_status === "Normal"
                        ? "Maintain"
                        : `${latest.weight_to_lose} kg`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right 50%: classification standards */}
              <div className="space-y-4 pt-4 sm:pt-0 sm:pl-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Classification Standards
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">PNP Standard</p>
                    <Badge
                      variant="outline"
                      className={cn("font-semibold", getPNPBadgeClass(latest.bmi_pnp_status as PNPClassification))}
                    >
                      {latest.bmi_pnp_status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">WHO Standard</p>
                    <Badge
                      variant="outline"
                      className={cn("font-semibold", getWHOBadgeClass(latest.bmi_who_status as WHOCategory))}
                    >
                      {latest.bmi_who_status}
                    </Badge>
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {/* ── History Table ── */}
      <Card>
        <CardHeader className="pb-3">
          <p className="flex items-center gap-2 text-base font-semibold">
            <History className="size-4 text-primary" />
            Assessment History
          </p>
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
                    <TableHead className="text-right">Height (cm)</TableHead>
                    <TableHead className="text-right">BMI</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-36" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {fmtDate(a.date_taken)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{a.weight}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(Number(a.height) * 100).toFixed(0)}
                      </TableCell>
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
                      <TableCell>
                        {(a.status === "draft" || a.status === "revision_required") && (
                          <div className="flex gap-1.5">
                            <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                              <Link href={`/user/assessment/new?edit=1&id=${a.id}`}>Edit</Link>
                            </Button>
                            {isAssessmentComplete(a) && (
                              <Button asChild size="sm" className="h-7 px-2 text-xs">
                                <Link href="/user/assessment/new">Submit</Link>
                              </Button>
                            )}
                          </div>
                        )}
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
