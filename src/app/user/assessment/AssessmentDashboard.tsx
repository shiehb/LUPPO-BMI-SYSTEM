"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Dumbbell,
  Heart,
  Info,
  Ruler,
  Scale,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getWHOBadgeClass, getHealthRecommendation } from "@/lib/utils/bmi";
import { PhotoGrid } from "@/components/PhotoGrid";
import { getFrameBadgeClass, getFrameSizeDescription } from "@/lib/utils/wrist";
import { getWaistStatusBadgeClass, getWaistInterpretation } from "@/lib/utils/waist";
import { calculateWHR, getWHRRisk, getWHRInterpretation, getWHRRiskBadgeClass } from "@/lib/utils/hip";
import { getPNPBadgeClass, getPNPWeightRecommendation } from "@/lib/utils/pnp";
import type { Assessment, Profile } from "@/lib/types";
import type { WHOCategory } from "@/lib/utils/bmi";
import type { PNPClassification } from "@/lib/utils/pnp";
import type { WaistStatus } from "@/lib/utils/waist";
import type { BodyFrame } from "@/lib/utils/wrist";

// ─── Row helper ──────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// ─── BMI meter bar ────────────────────────────────────────────────────────────

function BMIMeter({ bmi }: { bmi: number }) {
  // Clamp between 10 and 45 for visual purposes
  const pct = Math.min(100, Math.max(0, ((bmi - 10) / 35) * 100));
  const color =
    bmi < 18.5 ? "bg-blue-500"
    : bmi < 25  ? "bg-green-500"
    : bmi < 30  ? "bg-yellow-500"
    : bmi < 35  ? "bg-orange-500"
    : bmi < 40  ? "bg-red-500"
    :              "bg-red-800";

  return (
    <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Section icon header ──────────────────────────────────────────────────────

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <CardTitle className="flex items-center gap-2 text-base">
      <Icon className="size-4 text-primary" />
      {title}
    </CardTitle>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AssessmentDashboardProps {
  assessment: Assessment;
  profile: Pick<Profile, "full_name" | "rank" | "badge_number" | "gender" | "birthdate">;
  age: number | null;
}

export function AssessmentDashboard({
  assessment,
  profile,
  age,
}: AssessmentDashboardProps) {
  const whoCategory  = assessment.bmi_who_status as WHOCategory;
  const pnpCategory  = assessment.bmi_pnp_status as PNPClassification;
  const frameSize    = assessment.frame_size as BodyFrame | null;
  const waistStatus  = (
    assessment.waist !== null && profile.gender
      ? (assessment.waist <= (profile.gender === "Male" ? 90 : 80)
          ? "Acceptable"
          : "Overweight Risk")
      : null
  ) as WaistStatus | null;

  const whr =
    assessment.waist !== null && assessment.hip !== null
      ? calculateWHR(assessment.waist, assessment.hip)
      : null;

  const whrRisk =
    whr !== null && profile.gender
      ? getWHRRisk(whr, profile.gender)
      : null;

  const dateLabel = new Date(assessment.date_taken + "T00:00:00").toLocaleDateString(
    "en-PH",
    { year: "numeric", month: "long", day: "numeric" }
  );

  // Whether the PNP result is considered "passing"
  const isPNPPassing = [
    "Normal",
    "Acceptable BMI by Large Frame",
    "Acceptable BMI by Age",
  ].includes(pnpCategory);

  return (
    <div className="space-y-4">

      {/* ── Officer strip ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        {assessment.profile_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assessment.profile_image}
            alt="Profile"
            className="size-10 rounded-full object-cover ring-2 ring-primary/20"
          />
        )}
        <span className="font-semibold uppercase">
          {profile.rank ? `${profile.rank.toUpperCase()} ` : ""}
          {profile.full_name}
        </span>
        <span className="text-muted-foreground">Badge #{profile.badge_number}</span>
        {profile.gender && (
          <span className="text-muted-foreground">{profile.gender}</span>
        )}
        {age !== null && <span className="text-muted-foreground">Age {age}</span>}
        <span className="ml-auto text-xs text-muted-foreground">{dateLabel}</span>
      </div>

      {/* ── BMI Score ── */}
      <Card>
        <CardHeader className="pb-2">
          <SectionTitle icon={Scale} title="BMI Score" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-5xl font-bold tabular-nums tracking-tight">
                {assessment.bmi_score.toFixed(2)}
              </span>
              <span className="ml-1.5 text-sm text-muted-foreground">kg/m²</span>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>{assessment.weight} kg</div>
              <div>{assessment.height} m</div>
            </div>
          </div>
          <BMIMeter bmi={assessment.bmi_score} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>10</span>
            <span>18.5</span>
            <span>25</span>
            <span>30</span>
            <span>40+</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Classification ── */}
      <Card>
        <CardHeader className="pb-2">
          <SectionTitle icon={Activity} title="Classification" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-4">
            {/* WHO */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                WHO Standard
              </p>
              <Badge
                variant="outline"
                className={cn("text-sm font-semibold h-auto py-1", getWHOBadgeClass(whoCategory))}
              >
                {whoCategory}
              </Badge>
            </div>
            {/* PNP */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                PNP Standard
              </p>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("text-sm font-semibold h-auto py-1", getPNPBadgeClass(pnpCategory))}
                >
                  {pnpCategory}
                </Badge>
                {isPNPPassing ? (
                  <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                ) : (
                  <AlertTriangle className="size-4 text-red-500 shrink-0" />
                )}
              </div>
            </div>
          </div>
          <Separator />
          <Row label="Normal Weight Range" value={`${assessment.normal_weight_min}–${assessment.normal_weight_max} kg`} />
          <Row
            label="Weight to Lose"
            value={
              assessment.weight_to_lose > 0 ? (
                <span className="font-semibold text-orange-600">{assessment.weight_to_lose} kg</span>
              ) : (
                <span className="font-semibold text-green-600">Maintain</span>
              )
            }
          />
        </CardContent>
      </Card>

      {/* ── Body Analysis ── */}
      <Card>
        <CardHeader className="pb-2">
          <SectionTitle icon={Ruler} title="Body Analysis" />
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Waist */}
          {assessment.waist !== null && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Waist Circumference</span>
                  <span className="text-sm text-muted-foreground">{assessment.waist} cm</span>
                </div>
                {waistStatus && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", getWaistStatusBadgeClass(waistStatus))}
                    >
                      {waistStatus}
                    </Badge>
                    {profile.gender && (
                      <span className="text-xs text-muted-foreground">
                        {getWaistInterpretation(assessment.waist, profile.gender)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* WHR */}
          {whr !== null && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Waist-to-Hip Ratio (WHR)</span>
                  <span className="text-sm text-muted-foreground">{whr}</span>
                </div>
                {whrRisk && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", getWHRRiskBadgeClass(whrRisk))}
                    >
                      {whrRisk}
                    </Badge>
                    {profile.gender && (
                      <span className="text-xs text-muted-foreground">
                        {getWHRInterpretation(whr, profile.gender)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Frame Size */}
          {frameSize && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Body Frame Size</span>
                <Badge
                  variant="outline"
                  className={cn("text-xs", getFrameBadgeClass(frameSize))}
                >
                  {frameSize} Frame
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {getFrameSizeDescription(frameSize)}
              </p>
            </div>
          )}

          {/* Measurements summary row */}
          <Separator />
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            {assessment.waist !== null && (
              <div className="rounded border bg-muted/30 py-2 px-1">
                <div className="font-semibold text-base">{assessment.waist}</div>
                <div className="text-muted-foreground">Waist (cm)</div>
              </div>
            )}
            {assessment.hip !== null && (
              <div className="rounded border bg-muted/30 py-2 px-1">
                <div className="font-semibold text-base">{assessment.hip}</div>
                <div className="text-muted-foreground">Hip (cm)</div>
              </div>
            )}
            {assessment.wrist !== null && (
              <div className="rounded border bg-muted/30 py-2 px-1">
                <div className="font-semibold text-base">{assessment.wrist}</div>
                <div className="text-muted-foreground">Wrist (cm)</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Weight Recommendation (PNP) ── */}
      <Card>
        <CardHeader className="pb-2">
          <SectionTitle icon={Dumbbell} title="PNP Weight Recommendation" />
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {getPNPWeightRecommendation(pnpCategory, assessment.weight_to_lose)}
          </p>
        </CardContent>
      </Card>

      {/* ── Health Recommendation (WHO) ── */}
      <Card>
        <CardHeader className="pb-2">
          <SectionTitle icon={Heart} title="Health Recommendation" />
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {getHealthRecommendation(whoCategory)}
          </p>
        </CardContent>
      </Card>

      {/* ── Remarks ── */}
      {assessment.remarks && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <SectionTitle icon={Info} title="Clinical Summary" />
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {assessment.remarks}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── 3-View Photos ── */}
      {(assessment.photo_right_url || assessment.photo_front_url || assessment.photo_left_url) && (
        <Card>
          <CardHeader className="pb-2">
            <SectionTitle icon={User} title="3-View Photos" />
          </CardHeader>
          <CardContent>
            <PhotoGrid
              photos={[
                { label: "Right", url: assessment.photo_right_url },
                { label: "Front", url: assessment.photo_front_url },
                { label: "Left",  url: assessment.photo_left_url  },
              ]}
              gridClassName="grid gap-3 sm:grid-cols-3"
              labelSuffix="View"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
