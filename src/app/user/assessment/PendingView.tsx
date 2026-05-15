import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getBMIStatusColor, getPNPStatusColor } from "@/lib/bmi";
import type { BMIStatus, PNPStatus } from "@/lib/bmi";
import type { Assessment } from "@/lib/types";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function PendingView({
  assessment,
  name,
  rank,
}: {
  assessment: Assessment;
  name: string;
  rank?: string | null;
}) {
  const whoStatus = assessment.bmi_who_status as BMIStatus;
  const pnpStatus = assessment.bmi_pnp_status as PNPStatus;

  const submittedDate = assessment.submitted_at
    ? new Date(assessment.submitted_at).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const photoViews = [
    { label: "Right", url: assessment.photo_right_url },
    { label: "Front", url: assessment.photo_front_url },
    { label: "Left",  url: assessment.photo_left_url  },
  ];
  const hasPhotos = photoViews.some((p) => p.url);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Pending banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Pending Admin Approval
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            Submitted on {submittedDate}. You will be notified once an Admin
            reviews your assessment. No changes can be made at this time.
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Assessment</h1>
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-700"
          >
            Pending Approval
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground uppercase">
          {rank ? `${rank.toUpperCase()} ` : ""}{name} · Read-only while under review.
        </p>
      </div>

      {/* Results card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">BMI Results</CardTitle>
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
              <p className="mt-2 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
              <p className="mt-2 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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

          <Row label="Weight" value={`${assessment.weight} kg`} />
          <Row label="Height" value={`${(Number(assessment.height) * 100).toFixed(0)} cm`} />
          {assessment.waist != null && (
            <Row label="Waist" value={`${assessment.waist} cm`} />
          )}
          {assessment.hip != null && (
            <Row label="Hip" value={`${assessment.hip} cm`} />
          )}
          {assessment.wrist != null && (
            <Row label="Wrist" value={`${assessment.wrist} cm`} />
          )}

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
                <span className="font-semibold text-green-600">
                  Within range
                </span>
              )
            }
          />
        </CardContent>
      </Card>

      {/* Photos */}
      {hasPhotos && (
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
      )}
    </div>
  );
}
