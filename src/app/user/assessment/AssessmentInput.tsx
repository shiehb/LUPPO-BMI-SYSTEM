"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, Upload, X, Lock, AlertTriangle,
  CheckCircle2, Clock, Save, Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getBMIStatusColor, getPNPStatusColor } from "@/lib/bmi";
import { useAssessmentStore, computePreview } from "@/store/assessmentStore";
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

// ─── Schemas ──────────────────────────────────────────────────────────────────

// Validates a number string only if it is non-empty
function optionalNumeric(min: number, max: number, label: string) {
  return z.string().refine(
    (v) => {
      if (!v.trim()) return true;
      const n = parseFloat(v);
      return !isNaN(n) && n >= min && n <= max;
    },
    `Enter a valid ${label} (${min}–${max})`
  );
}

// Draft: weight + height required; circumferences optional (validated only when filled)
const draftSchema = z.object({
  weight: z
    .string()
    .min(1, "Weight is required")
    .refine(
      (v) => { const n = parseFloat(v); return !isNaN(n) && n > 0 && n <= 500; },
      "Enter a valid weight (1–500 kg)"
    ),
  height: z
    .string()
    .min(1, "Height is required")
    .refine(
      (v) => { const n = parseFloat(v); return !isNaN(n) && n >= 0.5 && n <= 3; },
      "Enter height between 0.5–3 m"
    ),
  waist: optionalNumeric(1, 300, "waist (cm)"),
  hip:   optionalNumeric(1, 300, "hip (cm)"),
  wrist: optionalNumeric(1, 50,  "wrist (cm)"),
});

// Submit: all fields required
const submitSchema = z.object({
  weight: z
    .string()
    .min(1, "Weight is required")
    .refine(
      (v) => { const n = parseFloat(v); return !isNaN(n) && n > 0 && n <= 500; },
      "Enter a valid weight (1–500 kg)"
    ),
  height: z
    .string()
    .min(1, "Height is required")
    .refine(
      (v) => { const n = parseFloat(v); return !isNaN(n) && n >= 0.5 && n <= 3; },
      "Enter height between 0.5–3 m"
    ),
  waist: z
    .string()
    .min(1, "Waist is required to submit")
    .refine(
      (v) => { const n = parseFloat(v); return !isNaN(n) && n > 0 && n <= 300; },
      "Enter a valid waist (1–300 cm)"
    ),
  hip: z
    .string()
    .min(1, "Hip is required to submit")
    .refine(
      (v) => { const n = parseFloat(v); return !isNaN(n) && n > 0 && n <= 300; },
      "Enter a valid hip (1–300 cm)"
    ),
  wrist: z
    .string()
    .min(1, "Wrist is required to submit")
    .refine(
      (v) => { const n = parseFloat(v); return !isNaN(n) && n > 0 && n <= 50; },
      "Enter a valid wrist (1–50 cm)"
    ),
});

type FormValues = z.infer<typeof draftSchema>;
type PhotoView = "right" | "front" | "left";

const PHOTO_LABELS: Record<PhotoView, string> = {
  right: "Right",
  front: "Front",
  left:  "Left",
};

interface PhotoFile {
  file:    File;
  preview: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AssessmentInput({
  profile,
  age,
  initialData,
}: {
  profile:     Profile;
  age:         number | null;
  initialData?: Assessment | null;
}) {
  const router = useRouter();

  const isLocked   = initialData?.status === "pending_approval" || initialData?.status === "approved";
  const isRevision = initialData?.status === "revision_required";

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [isConfirming,  setIsConfirming]  = useState(false);
  const [cancelOpen,    setCancelOpen]    = useState(false);
  const [confirmOpen,   setConfirmOpen]   = useState(false);
  const [pendingSave,   setPendingSave]   = useState<import("./actions").SaveDraftPayload | null>(null);
  const [photos,        setPhotos]        = useState<Partial<Record<PhotoView, PhotoFile>>>({});

  const { setProfileContext, setMeasurements } = useAssessmentStore();

  useEffect(() => {
    setProfileContext({ age, gender: profile.gender });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(draftSchema),
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

  useEffect(() => {
    setMeasurements({
      weightKg: parseFloat(weightVal) || null,
      heightM:  parseFloat(heightVal) || null,
      waistCm:  parseFloat(waistVal)  || null,
      hipCm:    parseFloat(hipVal)    || null,
      wristCm:  parseFloat(wristVal)  || null,
    });
  }, [weightVal, heightVal, waistVal, hipVal, wristVal, setMeasurements]);

  const storeState = useAssessmentStore();
  const bmiPreview = computePreview(storeState);

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
    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${Date.now()}-${view}.${ext}`;
    const { error } = await supabase.storage
      .from("assessment-photos")
      .upload(path, file, { upsert: true });
    if (error) { console.error(`Photo upload (${view}):`, error.message); return null; }
    return supabase.storage.from("assessment-photos").getPublicUrl(path).data.publicUrl;
  }

  async function uploadNewPhotos(userId: string): Promise<{
    rightUrl: string | null;
    frontUrl: string | null;
    leftUrl:  string | null;
    error?:   string;
  }> {
    const [newRight, newFront, newLeft] = await Promise.all([
      photos.right ? uploadPhoto("right", photos.right.file, userId) : Promise.resolve(null),
      photos.front ? uploadPhoto("front", photos.front.file, userId) : Promise.resolve(null),
      photos.left  ? uploadPhoto("left",  photos.left.file,  userId) : Promise.resolve(null),
    ]);

    if (
      (photos.right && newRight === null) ||
      (photos.front && newFront === null) ||
      (photos.left  && newLeft  === null)
    ) {
      return { rightUrl: null, frontUrl: null, leftUrl: null, error: "One or more photos failed to upload. Please try again." };
    }

    return {
      rightUrl: newRight ?? initialData?.photo_right_url ?? null,
      frontUrl: newFront ?? initialData?.photo_front_url ?? null,
      leftUrl:  newLeft  ?? initialData?.photo_left_url  ?? null,
    };
  }

  // ─── Shared pre-confirm logic ─────────────────────────────────────────────

  async function prepareAndConfirm(intent: "draft" | "submit") {
    const setWorking = intent === "draft" ? setIsSavingDraft : setIsSubmitting;
    setWorking(true);

    try {
      const values = form.getValues();

      if (intent === "draft") {
        // Only weight + height are required for a draft save
        const result = draftSchema.safeParse(values);
        if (!result.success) {
          await form.trigger(["weight", "height"]);
          toast.error("Weight and height are required to save a draft.");
          return;
        }
      } else {
        // Full strict validation for submit
        const result = submitSchema.safeParse(values);
        if (!result.success) {
          // Mirror errors into RHF so fields highlight
          const fieldErrors = result.error.flatten().fieldErrors;
          (Object.keys(fieldErrors) as (keyof FormValues)[]).forEach((field) => {
            const msg = fieldErrors[field]?.[0];
            if (msg) form.setError(field, { type: "manual", message: msg });
          });

          // Check missing photos too
          const missingPhotos = (["right", "front", "left"] as PhotoView[]).filter(
            (v) => !photos[v] && !(initialData as Record<string, string | null> | null)?.[`photo_${v}_url`]
          );
          const missingFields = result.error.flatten().fieldErrors;
          const missing = [
            ...Object.entries(missingFields)
              .filter(([, m]) => m && m.length > 0)
              .map(([k]) => k),
            ...missingPhotos.map((v) => `${v} photo`),
          ];

          toast.error(
            missing.length > 0
              ? `Required to submit: ${missing.join(", ")}.`
              : "Please fix the highlighted errors before submitting."
          );
          return;
        }

        // Photos: all 3 required for submit
        const missingPhotos = (["right", "front", "left"] as PhotoView[]).filter(
          (v) => !photos[v] && !(initialData as Record<string, string | null> | null)?.[`photo_${v}_url`]
        );
        if (missingPhotos.length > 0) {
          toast.error(`All 3 photos are required to submit. Missing: ${missingPhotos.join(", ")} view(s).`);
          return;
        }
      }

      // Get authenticated user for uploads
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Session expired. Please sign in again."); return; }

      const uploaded = await uploadNewPhotos(user.id);
      if (uploaded.error) { toast.error(uploaded.error); return; }

      setPendingSave({
        intent,
        assessmentId:  isRevision ? initialData?.id : undefined,
        weight:        parseFloat(values.weight),
        height:        parseFloat(values.height),
        waist:         values.waist.trim()  ? parseFloat(values.waist)  : null,
        hip:           values.hip.trim()    ? parseFloat(values.hip)    : null,
        wrist:         values.wrist.trim()  ? parseFloat(values.wrist)  : null,
        photoRightUrl: uploaded.rightUrl,
        photoFrontUrl: uploaded.frontUrl,
        photoLeftUrl:  uploaded.leftUrl,
      });
      setConfirmOpen(true);

    } finally {
      setWorking(false);
    }
  }

  // ─── Confirm save ─────────────────────────────────────────────────────────

  async function handleConfirmSave() {
    if (!pendingSave) return;
    setIsConfirming(true);
    try {
      const result = await saveDraft(pendingSave);
      if (result.error) { toast.error(result.error); return; }

      if (pendingSave.intent === "submit") {
        toast.success(
          isRevision
            ? "Assessment resubmitted for approval."
            : "Assessment submitted for approval."
        );
      } else {
        toast.success("Draft saved successfully.");
      }

      setConfirmOpen(false);
      setPendingSave(null);
      router.push("/user/assessment");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsConfirming(false);
    }
  }

  const dateTaken = new Date().toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });

  const isBusy = isSavingDraft || isSubmitting;

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Page title ── */}
      <div>
        <h1 className="text-2xl font-bold">
          {isLocked
            ? "BMI Assessment (Read-Only)"
            : isRevision
            ? "Revise & Resubmit Assessment"
            : initialData
            ? "Edit Draft"
            : "BMI Self-Assessment"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLocked
            ? "This assessment has been submitted and cannot be edited."
            : isRevision
            ? "Your assessment was returned for revision. Update your measurements and resubmit."
            : "Save a partial draft at any time. All fields are required before you can submit."}
        </p>
      </div>

      {/* ── Lifecycle status banners ── */}
      {initialData?.status === "approved" && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Assessment Approved</p>
            <p className="text-emerald-700 mt-0.5">No further action is required.</p>
          </div>
        </div>
      )}
      {initialData?.status === "pending_approval" && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Under Review</p>
            <p className="text-amber-700 mt-0.5">
              Pending admin approval. The form is locked until a decision is made.
            </p>
          </div>
        </div>
      )}
      {isRevision && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Revision Required</p>
            {initialData?.admin_remarks && (
              <p className="mt-0.5 text-orange-700">
                Admin remarks: <span className="italic">{initialData.admin_remarks}</span>
              </p>
            )}
            <p className="mt-1 text-orange-600">Correct your measurements and resubmit.</p>
          </div>
        </div>
      )}

      {/* ── Officer strip ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <span className="font-semibold uppercase">
          {profile.rank ? `${profile.rank.toUpperCase()} ` : ""}{profile.full_name}
        </span>
        <span className="text-muted-foreground">Badge #{profile.badge_number}</span>
        {profile.gender && <span className="text-muted-foreground">{profile.gender}</span>}
        {age !== null && <span className="text-muted-foreground">Age {age}</span>}
        <span className="ml-auto text-xs text-muted-foreground">{dateTaken}</span>
      </div>

      {/* ── Form (no native submit — both buttons use onClick) ── */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">

        {/* Measurements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Measurements
              {isLocked && <Lock className="size-3.5 text-muted-foreground" />}
            </CardTitle>
            <CardDescription>
              {isLocked
                ? "These measurements are locked and cannot be edited."
                : "BMI calculates automatically as you type. Weight and height are required to save a draft."}
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
                Circumference (cm) — required to submit
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="waist">Waist</FieldLabel>
                  <Input id="waist" type="number" step="0.1" min="1" max="300"
                    placeholder="e.g. 80" disabled={isLocked} {...form.register("waist")} />
                  <FieldError errors={[errors.waist]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="hip">Hip</FieldLabel>
                  <Input id="hip" type="number" step="0.1" min="1" max="300"
                    placeholder="e.g. 95" disabled={isLocked} {...form.register("hip")} />
                  <FieldError errors={[errors.hip]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="wrist">Wrist</FieldLabel>
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

        {/* 3-View Photos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3-View Photos</CardTitle>
            <CardDescription>
              {isLocked
                ? "Photos cannot be changed."
                : "All 3 photos are required to submit. You can save a draft without them."}
              {!isLocked && initialData && " Previously uploaded photos are preserved if you don't select new ones."}
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
                  disabled={isLocked}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Action buttons ── */}
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
            {/* Primary: Submit */}
            <Button
              type="button"
              disabled={isBusy || !bmiPreview}
              onClick={() => prepareAndConfirm("submit")}
              className="w-full sm:flex-1"
            >
              {isSubmitting ? (
                <><Loader2 className="size-4 mr-2 animate-spin" />Submitting…</>
              ) : (
                <>
                  <Send className="size-4 mr-2" />
                  {isRevision ? "Save & Resubmit" : "Submit for Approval"}
                </>
              )}
            </Button>

            {/* Secondary: Save Draft */}
            <Button
              type="button"
              variant="outline"
              disabled={isBusy || !bmiPreview}
              onClick={() => prepareAndConfirm("draft")}
              className="w-full sm:flex-1"
            >
              {isSavingDraft ? (
                <><Loader2 className="size-4 mr-2 animate-spin" />Saving…</>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  Save Draft
                </>
              )}
            </Button>

            {/* Cancel */}
            <Button
              type="button"
              variant="ghost"
              disabled={isBusy}
              onClick={() => setCancelOpen(true)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        )}
      </form>

      {/* ── Confirm save/submit dialog ── */}
      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          pendingSave?.intent === "submit"
            ? isRevision ? "Resubmit Assessment?" : "Submit for Approval?"
            : "Save Draft?"
        }
        description={
          pendingSave?.intent === "submit"
            ? isRevision
              ? "Your corrected measurements will be saved and resubmitted for admin review."
              : "Your assessment will be submitted to an admin for review. Make sure all information is correct."
            : "Your progress will be saved as a draft. You can come back and complete it later."
        }
        confirmLabel={
          pendingSave?.intent === "submit"
            ? isRevision ? "Save & Resubmit" : "Submit for Approval"
            : "Save Draft"
        }
        isPending={isConfirming}
        onConfirm={handleConfirmSave}
      />

      {/* ── Confirm discard dialog ── */}
      <ConfirmationDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Discard Changes?"
        description="All unsaved measurements and photos will be lost."
        confirmLabel="Discard"
        onConfirm={() => router.push("/user/assessment")}
      />
    </div>
  );
}

// ─── Photo slot ───────────────────────────────────────────────────────────────

function PhotoSlot({
  view,
  label,
  photo,
  existingUrl,
  onSelect,
  onRemove,
  disabled,
}: {
  view:        PhotoView;
  label:       string;
  photo:       PhotoFile | undefined;
  existingUrl: string | null;
  onSelect:    (file: File) => void;
  onRemove:    () => void;
  disabled?:   boolean;
}) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const displayUrl = photo?.preview ?? existingUrl ?? null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-center text-muted-foreground">{label} View</p>
      {displayUrl ? (
        <div className="relative aspect-square overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displayUrl} alt={`${view} view`} className="h-full w-full object-cover" />
          {!disabled && (photo || existingUrl) && (
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
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          aria-label={`Upload ${label} view photo`}
          className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:pointer-events-none disabled:opacity-50"
        >
          <Upload className="size-5" />
          <span className="text-xs">Upload</span>
        </button>
      )}
      <input
        ref={inputRef}
        id={`photo-${view}`}
        type="file"
        accept="image/*"
        aria-label={`Upload ${label} view photo`}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
