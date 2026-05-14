"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload, X, Lock, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getBMIStatusColor } from "@/lib/bmi";
import { getPNPStatusColor } from "@/lib/bmi";
import {
  useAssessmentStore,
  computePreview,
} from "@/store/assessmentStore";
import { saveDraft } from "./actions";
import type { Assessment, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

// ─── Validation schema ────────────────────────────────────────────────────────

const schema = z.object({
  weight: z
    .string()
    .min(1, "Required")
    .refine(
      (v) => { const n = parseFloat(v); return !isNaN(n) && n > 0 && n <= 500; },
      "Enter a valid weight (1–500 kg)"
    ),
  height: z
    .string()
    .min(1, "Required")
    .refine(
      (v) => { const n = parseFloat(v); return !isNaN(n) && n >= 0.5 && n <= 3; },
      "Enter height between 0.5–3 m"
    ),
  waist: z
    .string()
    .min(1, "Waist measurement is required")
    .refine(
      (v) => { const n = parseFloat(v); return !isNaN(n) && n > 0 && n <= 300; },
      "Enter a valid waist (1–300 cm)"
    ),
  hip: z
    .string()
    .min(1, "Hip measurement is required")
    .refine(
      (v) => { const n = parseFloat(v); return !isNaN(n) && n > 0 && n <= 300; },
      "Enter a valid hip (1–300 cm)"
    ),
  wrist: z
    .string()
    .min(1, "Wrist measurement is required")
    .refine(
      (v) => { const n = parseFloat(v); return !isNaN(n) && n > 0 && n <= 50; },
      "Enter a valid wrist (1–50 cm)"
    ),
});

type FormValues = z.infer<typeof schema>;
type PhotoView = "right" | "front" | "left";

const PHOTO_LABELS: Record<PhotoView, string> = {
  right: "Right",
  front: "Front",
  left: "Left",
};

interface PhotoFile {
  file: File;
  preview: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AssessmentInput({
  profile,
  age,
  initialData,
}: {
  profile: Profile;
  age: number | null;
  initialData?: Assessment | null;
}) {
  const router = useRouter();

  // Lifecycle-based read/write logic
  const isLocked =
    initialData?.status === "pending_approval" || initialData?.status === "approved";
  const isRejected = initialData?.status === "rejected";

  const [isSaving, setIsSaving]           = useState(false);
  const [isConfirming, setIsConfirming]   = useState(false);
  const [cancelOpen, setCancelOpen]       = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [pendingSave, setPendingSave]     = useState<import("./actions").SaveDraftPayload | null>(null);
  const [photos, setPhotos]               = useState<Partial<Record<PhotoView, PhotoFile>>>({});

  const { setProfileContext, setMeasurements } = useAssessmentStore();

  // Sync profile context once on mount
  useEffect(() => {
    setProfileContext({ age, gender: profile.gender });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      weight: initialData?.weight?.toString() ?? "",
      height: initialData?.height?.toString() ?? "",
      waist:  initialData?.waist?.toString()  ?? "",
      hip:    initialData?.hip?.toString()    ?? "",
      wrist:  initialData?.wrist?.toString()  ?? "",
    },
  });

  const { formState: { errors } } = form;
  const weightVal = form.watch("weight");
  const heightVal = form.watch("height");
  const waistVal  = form.watch("waist");
  const hipVal    = form.watch("hip");
  const wristVal  = form.watch("wrist");

  // Sync form values into store for live preview
  useEffect(() => {
    setMeasurements({
      weightKg: parseFloat(weightVal) || null,
      heightM:  parseFloat(heightVal) || null,
      waistCm:  parseFloat(waistVal)  || null,
      hipCm:    parseFloat(hipVal)    || null,
      wristCm:  parseFloat(wristVal)  || null,
    });
  }, [weightVal, heightVal, waistVal, hipVal, wristVal, setMeasurements]);

  // Compute live preview from store state
  const storeState  = useAssessmentStore();
  const bmiPreview  = computePreview(storeState);

  // ─── Photo handlers ───────────────────────────────────────────────────────

  function handlePhotoSelect(view: PhotoView, file: File | undefined) {
    if (!file) return;
    setPhotos((prev) => {
      if (prev[view]) URL.revokeObjectURL(prev[view]!.preview);
      return { ...prev, [view]: { file, preview: URL.createObjectURL(file) } };
    });
  }

  function removePhoto(view: PhotoView) {
    setPhotos((prev) => {
      const next = { ...prev };
      if (next[view]) URL.revokeObjectURL(next[view]!.preview);
      delete next[view];
      return next;
    });
  }

  async function uploadPhoto(view: PhotoView, file: File, userId: string): Promise<string | null> {
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${Date.now()}-${view}.${ext}`;
    const { error } = await supabase.storage
      .from("assessment-photos")
      .upload(path, file, { upsert: true });
    if (error) {
      console.error(`Photo upload (${view}):`, error.message);
      return null;
    }
    return supabase.storage.from("assessment-photos").getPublicUrl(path).data.publicUrl;
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Session expired. Please sign in again.");
        return;
      }

      const missingViews = (["right", "front", "left"] as PhotoView[]).filter(
        (v) => !photos[v] && !(initialData as Record<string, string | null> | null)?.[`photo_${v}_url`]
      );
      if (missingViews.length > 0) {
        toast.error("All 3 photos are required.");
        return;
      }

      const [newRightUrl, newFrontUrl, newLeftUrl] = await Promise.all([
        photos.right ? uploadPhoto("right", photos.right.file, user.id) : Promise.resolve(null),
        photos.front ? uploadPhoto("front", photos.front.file, user.id) : Promise.resolve(null),
        photos.left  ? uploadPhoto("left",  photos.left.file,  user.id) : Promise.resolve(null),
      ]);

      if (
        (photos.right && newRightUrl === null) ||
        (photos.front && newFrontUrl === null) ||
        (photos.left  && newLeftUrl  === null)
      ) {
        toast.error("One or more photos failed to upload. Please try again.");
        return;
      }

      setPendingSave({
        weight:        parseFloat(values.weight),
        height:        parseFloat(values.height),
        waist:         parseFloat(values.waist),
        hip:           parseFloat(values.hip),
        wrist:         parseFloat(values.wrist),
        photoRightUrl: newRightUrl ?? initialData?.photo_right_url ?? null,
        photoFrontUrl: newFrontUrl ?? initialData?.photo_front_url ?? null,
        photoLeftUrl:  newLeftUrl  ?? initialData?.photo_left_url  ?? null,
      });
      setSaveConfirmOpen(true);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmSave() {
    if (!pendingSave) return;
    setIsConfirming(true);
    try {
      const result = await saveDraft(pendingSave);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Draft saved successfully.");
      setSaveConfirmOpen(false);
      setPendingSave(null);
      if (initialData) {
        router.push("/user/assessment");
      } else {
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save draft.");
    } finally {
      setIsConfirming(false);
    }
  }

  function handleCancelConfirm() {
    router.push("/user/assessment");
  }

  const dateTaken = new Date().toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">
          {isLocked
            ? "BMI Assessment (Read-Only)"
            : isRejected
            ? "Revise & Resubmit Assessment"
            : initialData
            ? "Edit Draft"
            : "BMI Self-Assessment"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLocked
            ? "This assessment has been submitted and cannot be edited."
            : isRejected
            ? "Your assessment was rejected. Update your measurements and resubmit."
            : "Enter your measurements. Results calculate live — save a draft to review before submitting."}
        </p>
      </div>

      {/* ── Lifecycle status banners ── */}
      {initialData?.status === "approved" && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Assessment Approved</p>
            <p className="text-emerald-700 mt-0.5">
              Your BMI assessment has been approved. No further action is required.
            </p>
          </div>
        </div>
      )}
      {initialData?.status === "pending_approval" && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Under Review</p>
            <p className="text-amber-700 mt-0.5">
              Your assessment is pending admin approval. The form is locked until a decision is made.
            </p>
          </div>
        </div>
      )}
      {isRejected && initialData?.rejection_reason && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Assessment Rejected</p>
            <p className="mt-0.5 text-red-700">
              Reason: <span className="italic">{initialData.rejection_reason}</span>
            </p>
            <p className="mt-1 text-red-600">
              Please correct your measurements and resubmit.
            </p>
          </div>
        </div>
      )}

      {/* Officer info strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <span className="font-semibold uppercase">
          {profile.rank ? `${profile.rank.toUpperCase()} ` : ""}{profile.full_name}
        </span>
        <span className="text-muted-foreground">Badge #{profile.badge_number}</span>
        {profile.gender && <span className="text-muted-foreground">{profile.gender}</span>}
        {age !== null && <span className="text-muted-foreground">Age {age}</span>}
        <span className="ml-auto text-xs text-muted-foreground">{dateTaken}</span>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Measurements ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Measurements
              {isLocked && <Lock className="size-3.5 text-muted-foreground" />}
            </CardTitle>
            <CardDescription>
              {isLocked
                ? "These measurements are locked and cannot be edited."
                : "BMI calculates automatically as you type."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="weight">Weight (kg) *</FieldLabel>
                  <Input id="weight" type="number" step="0.1" min="1" max="500"
                    placeholder="e.g. 70.5" disabled={isLocked} {...form.register("weight")} />
                  <FieldError errors={[errors.weight]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="height">Height (m) *</FieldLabel>
                  <Input id="height" type="number" step="0.01" min="0.5" max="3"
                    placeholder="e.g. 1.70" disabled={isLocked} {...form.register("height")} />
                  <FieldError errors={[errors.height]} />
                </Field>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Circumference (cm)
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="waist">Waist *</FieldLabel>
                  <Input id="waist" type="number" step="0.1" min="1" max="300"
                    placeholder="e.g. 80" disabled={isLocked} {...form.register("waist")} />
                  <FieldError errors={[errors.waist]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="hip">Hip *</FieldLabel>
                  <Input id="hip" type="number" step="0.1" min="1" max="300"
                    placeholder="e.g. 95" disabled={isLocked} {...form.register("hip")} />
                  <FieldError errors={[errors.hip]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="wrist">Wrist *</FieldLabel>
                  <Input id="wrist" type="number" step="0.1" min="1" max="50"
                    placeholder="e.g. 16" disabled={isLocked} {...form.register("wrist")} />
                  <FieldError errors={[errors.wrist]} />
                </Field>
              </div>

              {/* Live BMI preview */}
              {bmiPreview && (
                <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">BMI Score</span>
                    <span className="text-2xl font-bold">{bmiPreview.bmi.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">WHO Standard</span>
                      <Badge variant="outline" className={getBMIStatusColor(bmiPreview.whoCategory)}>
                        {bmiPreview.whoCategory}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">PNP Standard</span>
                      <Badge variant="outline" className={getPNPStatusColor(bmiPreview.pnpClassification)}>
                        {bmiPreview.pnpClassification}
                      </Badge>
                    </div>
                    {bmiPreview.frameSize && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Frame Size</span>
                        <span className="font-medium">{bmiPreview.frameSize}</span>
                      </div>
                    )}
                    {bmiPreview.whr !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">WHR</span>
                        <span className="font-medium">
                          {bmiPreview.whr.toFixed(3)}
                          {bmiPreview.whrRisk && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              ({bmiPreview.whrRisk})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Normal Weight Range</span>
                      <span className="font-medium">
                        {bmiPreview.normalWeightMin}–{bmiPreview.normalWeightMax} kg
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Weight to Lose</span>
                      <span className={cn(
                        "font-semibold",
                        bmiPreview.weightToLose > 0 ? "text-orange-600" : "text-green-600"
                      )}>
                        {bmiPreview.weightToLose > 0
                          ? `${bmiPreview.weightToLose} kg`
                          : "Within range"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </FieldGroup>
          </CardContent>
        </Card>

        {/* ── 3-View Photos ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3-View Photos</CardTitle>
            <CardDescription>
              All 3 photos are required.
              {initialData && " Previously uploaded photos are preserved if you don't select new ones."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {(["right", "front", "left"] as PhotoView[]).map((view) => (
                <PhotoSlot
                  key={view}
                  view={view}
                  label={PHOTO_LABELS[view]}
                  photo={photos[view]}
                  existingUrl={
                    (initialData as Record<string, string | null> | null)?.[`photo_${view}_url`] ?? null
                  }
                  onSelect={(f) => handlePhotoSelect(view, f)}
                  onRemove={() => removePhoto(view)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {isLocked ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/user/assessment")}
            className="w-full sm:w-auto"
          >
            Back to Assessments
          </Button>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Button type="submit" disabled={isSaving || !bmiPreview} className="w-full sm:flex-1">
              {isSaving ? (
                <><Loader2 className="size-4 mr-2 animate-spin" />Saving…</>
              ) : isRejected ? (
                "Save & Resubmit"
              ) : (
                "Save Draft"
              )}
            </Button>
            <Button type="button" variant="outline" disabled={isSaving}
              onClick={() => setCancelOpen(true)} className="w-full sm:flex-1">
              Cancel
            </Button>
          </div>
        )}
      </form>

      <ConfirmationDialog
        open={saveConfirmOpen}
        onOpenChange={setSaveConfirmOpen}
        title="Save Draft?"
        description="Your measurements and photos will be saved as a draft. You can review and submit it later."
        confirmLabel="Save Draft"
        isPending={isConfirming}
        onConfirm={handleConfirmSave}
      />
      <ConfirmationDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Discard Changes?"
        description="All unsaved measurements and photos will be lost."
        confirmLabel="Discard"
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}

// ─── Assessment photo slot ────────────────────────────────────────────────────

function PhotoSlot({
  view,
  label,
  photo,
  existingUrl,
  onSelect,
  onRemove,
}: {
  view: PhotoView;
  label: string;
  photo: PhotoFile | undefined;
  existingUrl: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const inputId    = `photo-${view}`;
  const displayUrl = photo?.preview ?? existingUrl ?? null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-center text-muted-foreground">{label} View</p>
      {displayUrl ? (
        <div className="relative aspect-square overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displayUrl} alt={`${view} view`} className="h-full w-full object-cover" />
          {(photo || existingUrl) && (
            <button
              type="button"
              onClick={photo ? onRemove : () => inputRef.current?.click()}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
              aria-label={photo ? `Remove ${view} photo` : `Replace ${view} photo`}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={`Upload ${label} view photo`}
          className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Upload className="size-5" />
          <span className="text-xs">Upload</span>
        </button>
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        aria-label={`Upload ${label} view photo`}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
