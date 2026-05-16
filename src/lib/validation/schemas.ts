import { z } from "zod";

// ── Reusable primitives ───────────────────────────────────────────────────────

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(100, `${label} must be 100 characters or fewer`)
    .regex(/^[\p{L}\p{M}'\-\s]+$/u, `${label} contains invalid characters`);

const dateString = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a valid date (YYYY-MM-DD)`);

const monthString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format");

export const UuidSchema = z.string().uuid("Invalid ID format");

// ── User schemas ──────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  first_name:   nameField("First name"),
  middle_name:  z.string().trim().max(100),
  last_name:    nameField("Last name"),
  qualifier:    z.string().trim().max(20),
  gender:       z.enum(["Male", "Female"]),
  birthdate:    dateString("Birthdate"),
  badge_number: z
    .string()
    .trim()
    .min(1, "Badge number is required")
    .max(20, "Badge number must be 20 characters or fewer")
    .regex(/^[A-Z0-9\-]+$/i, "Badge number must be alphanumeric"),
  rank:         z.string().trim().max(50),
  unit_station: z.string().trim().min(1, "Unit/Station is required").max(100),
  email:        z.string().trim().email("Invalid email address").toLowerCase(),
  role:         z.enum(["system_admin", "admin", "user"]),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  first_name:   nameField("First name"),
  middle_name:  z.string().trim().max(100),
  last_name:    nameField("Last name"),
  qualifier:    z.string().trim().max(20),
  gender:       z.enum(["Male", "Female"]),
  birthdate:    dateString("Birthdate"),
  rank:         z.string().trim().max(50),
  unit_station: z.string().trim().min(1, "Unit/Station is required").max(100),
  role:         z.enum(["system_admin", "admin", "user"]),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const UserSearchSchema = z.object({
  page:    z.number().int().min(1).max(10_000).default(1),
  limit:   z.number().int().min(1).max(100).default(20),
  search:  z.string().trim().max(100).default(""),
  role:    z.union([z.enum(["system_admin", "admin", "user"]), z.literal("")]).default(""),
  station: z.string().trim().max(100).default(""),
});

export const ArchivedUserSearchSchema = z.object({
  page:   z.number().int().min(1).max(10_000).default(1),
  limit:  z.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(""),
});

// ── Settings schemas ──────────────────────────────────────────────────────────

export const RankUnitNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name must be 100 characters or fewer")
  .regex(/^[\p{L}\p{M}0-9\s\-\/\.]+$/u, "Name contains invalid characters");

// ── Assessment window schema ──────────────────────────────────────────────────

export const AssessmentWindowSchema = z
  .object({
    monthStr:  monthString,
    startDate: dateString("Start date"),
    endDate:   dateString("End date"),
  })
  .refine(
    ({ startDate, endDate }) => new Date(startDate) <= new Date(endDate),
    { message: "Start date must be before or equal to end date", path: ["startDate"] }
  );

// ── Assessment payload schema ─────────────────────────────────────────────────

export const AssessmentPayloadSchema = z.object({
  intent:        z.enum(["draft", "submit"]),
  assessmentId:  z.string().uuid().optional(),
  weight:        z.number().min(20, "Weight is out of valid range").max(300, "Weight is out of valid range").nullable(),
  height:        z.number().min(0.5, "Height is out of valid range").max(3.0, "Height is out of valid range").nullable(),
  waist:         z.number().min(30, "Waist is out of valid range").max(200, "Waist is out of valid range").nullable(),
  hip:           z.number().min(30, "Hip is out of valid range").max(250, "Hip is out of valid range").nullable(),
  wrist:         z.number().min(5,  "Wrist is out of valid range").max(40,  "Wrist is out of valid range").nullable(),
  photoRightUrl: z.string().url("Invalid right photo URL").nullable(),
  photoFrontUrl: z.string().url("Invalid front photo URL").nullable(),
  photoLeftUrl:  z.string().url("Invalid left photo URL").nullable(),
});

// ── Assessment status schemas ─────────────────────────────────────────────────

export const UpdateAssessmentStatusSchema = z.object({
  id:           UuidSchema,
  status:       z.enum(["approved", "revision_required", "returned"]),
  adminRemarks: z.string().trim().max(1000).optional(),
});

export const PersonnelUpdateStatusSchema = z.object({
  id:              UuidSchema,
  status:          z.enum(["approved", "returned"]),
  rejectionReason: z.string().trim().max(1000).optional(),
});

export const NotifyPersonnelSchema = z.object({
  userId: UuidSchema,
  month:  monthString.optional(),
});
