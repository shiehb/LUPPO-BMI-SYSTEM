import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getBMIStatusColor, getPNPStatusColor } from "@/lib/bmi";
import type { BMIStatus, PNPStatus } from "@/lib/bmi";
import type { Assessment, OfficerSummary } from "@/lib/types";
import { ReviewActions } from "@/app/system_admin/assessments/[id]/ReviewActions";

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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default async function PersonnelAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = getAdminClient();

  const { data: assessment } = await admin
    .from("bmi_assessments")
    .select("*")
    .eq("id", id)
    .single<Assessment>();

  if (!assessment) notFound();

  const { data: officer } = await admin
    .from("profiles")
    .select("id, full_name, badge_number, rank, unit_station, gender, birthdate")
    .eq("id", assessment.user_id)
    .single<OfficerSummary>();

  const age = officer?.birthdate ? calculateAge(officer.birthdate) : null;
  const isPending = assessment.status === "pending_approval";
  const isRevisionRequired = assessment.status === "revision_required";
  const isReturned = assessment.status === "returned";

  const photoViews = [
    { label: "Right",  url: assessment.photo_right_url },
    { label: "Front",  url: assessment.photo_front_url },
    { label: "Left",   url: assessment.photo_left_url  },
  ];

  const whoStatus = assessment.bmi_who_status as BMIStatus;
  const pnpStatus = assessment.bmi_pnp_status as PNPStatus;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/dashboard/personnel">
          <ArrowLeft className="size-4 mr-1" />
          Back to Pending List
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Assessment Review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submitted{" "}
          {assessment.submitted_at
            ? new Date(assessment.submitted_at).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "—"}
        </p>
      </div>

      {/* Officer strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <span className="font-semibold uppercase">
          {officer?.rank ? `${officer.rank.toUpperCase()} ` : ""}
          {officer?.full_name ?? "Unknown Officer"}
        </span>
        {officer?.badge_number && (
          <span className="text-muted-foreground">Badge #{officer.badge_number}</span>
        )}
        {officer?.unit_station && (
          <span className="text-muted-foreground">{officer.unit_station}</span>
        )}
        {officer?.gender && (
          <span className="text-muted-foreground">{officer.gender}</span>
        )}
        {age !== null && (
          <span className="text-muted-foreground">Age {age}</span>
        )}
        {!isPending && (
          <span className="ml-auto">
            <Badge
              variant="outline"
              className={
                assessment.status === "approved"
                  ? "bg-green-100 text-green-800 border-green-200"
                  : isRevisionRequired
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : isReturned
                  ? "bg-red-100 text-red-800 border-red-200"
                  : "bg-red-100 text-red-800 border-red-200"
              }
            >
              {assessment.status === "approved"
                ? "Approved"
                : isRevisionRequired
                ? "Revision Required"
                : "Returned"}
            </Badge>
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* 3-View Photos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3-View Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {photoViews.map(({ label, url }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <p className="text-center text-xs font-medium text-muted-foreground">
                    {label} View
                  </p>
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
                    <div className="flex aspect-square items-center justify-center rounded-lg border bg-muted/40 text-xs text-muted-foreground">
                      Not uploaded
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* BMI Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-600" />
              BMI Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">BMI Score</span>
              <span className="text-3xl font-bold tabular-nums">
                {assessment.bmi_score.toFixed(2)}
              </span>
            </div>

            <Separator />

            <div className="grid sm:grid-cols-2 gap-x-6 pt-1">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-2 mb-1">
                  WHO Standard
                </p>
                <Row
                  label="Classification"
                  value={
                    <Badge variant="outline" className={getBMIStatusColor(whoStatus)}>
                      {whoStatus}
                    </Badge>
                  }
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-2 mb-1">
                  PNP Standard
                </p>
                <Row
                  label="Classification"
                  value={
                    <Badge variant="outline" className={getPNPStatusColor(pnpStatus)}>
                      {pnpStatus}
                    </Badge>
                  }
                />
              </div>
            </div>

            <Separator />

            <Row label="Weight"  value={`${assessment.weight} kg`} />
            <Row label="Height"  value={`${assessment.height} m`} />
            {assessment.waist  != null && <Row label="Waist"  value={`${assessment.waist} cm`} />}
            {assessment.hip    != null && <Row label="Hip"    value={`${assessment.hip} cm`} />}
            {assessment.wrist  != null && <Row label="Wrist"  value={`${assessment.wrist} cm`} />}

            <Separator />

            <Row
              label="Normal Weight Range"
              value={`${assessment.normal_weight_min}–${assessment.normal_weight_max} kg`}
            />
            <Row
              label="Weight to Lose"
              value={
                assessment.weight_to_lose > 0 ? (
                  <span className="font-semibold text-orange-600">
                    {assessment.weight_to_lose} kg
                  </span>
                ) : (
                  <span className="font-semibold text-green-600">Within range</span>
                )
              }
            />
          </CardContent>
        </Card>

        {/* Bottom action bar */}
        <div className="border-t pt-4">
          {isPending ? (
            <ReviewActions
              assessmentId={assessment.id}
              editRequested={assessment.edit_requested ?? false}
            />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                This assessment has already been reviewed.
              </p>
              {(assessment.admin_remarks || assessment.rejection_reason) && (
                <div className={`rounded-md px-3 py-2 border text-sm ${isRevisionRequired ? "bg-amber-50 border-amber-200" : "bg-destructive/10 border-destructive/20"}`}>
                  <span className={`font-semibold mr-1 ${isRevisionRequired ? "text-amber-800" : "text-destructive"}`}>
                    {isReturned ? "Return Reason:" : "Admin Remarks:"}
                  </span>
                  {assessment.admin_remarks ?? assessment.rejection_reason}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
