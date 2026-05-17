"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { requireSystemAdmin, getAdminClient } from "@/lib/auth/guards";
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserSearchSchema,
  ArchivedUserSearchSchema,
  UuidSchema,
} from "@/lib/validation/schemas";
import { withActionGuard } from "@/lib/errors";
import { audit, logger } from "@/lib/logger";
import type { Profile, Role } from "@/lib/types";

export interface UsersResult {
  data:   Profile[];
  count:  number;
  error?: string;
}

// ── Shared payload types ──────────────────────────────────────────────────────

interface PersonalFields {
  first_name:  string;
  middle_name: string;
  last_name:   string;
  qualifier:   string;
  gender:      "Male" | "Female";
  birthdate:   string;
}

interface ServiceFields {
  badge_number: string;
  rank:         string;
  unit_station: string;
}

export type CreateUserPayload = PersonalFields &
  ServiceFields & {
    email: string;
    role:  Role;
  };

// badge_number and email are immutable after creation
export type UpdateUserPayload = PersonalFields & {
  rank:         string;
  unit_station: string;
  role:         Role;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildFullName(p: PersonalFields): string {
  return [p.first_name, p.middle_name, p.last_name, p.qualifier]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}

function generatePassword(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  return Array.from(crypto.randomBytes(14))
    .map((b) => charset[b % charset.length])
    .join("");
}

async function sendWelcomeEmail(opts: {
  to:           string;
  badgeNumber:  string;
  fullName:     string;
  tempPassword: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("email", "RESEND_API_KEY not set — skipping welcome email");
    return;
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    process.env.EMAIL_FROM ?? "noreply@luppo.gov.ph",
        to:      [opts.to],
        subject: "Your LUPPO BMI System — Account Credentials",
        html: `
          <p>Hello <strong>${opts.fullName}</strong>,</p>
          <p>Your account on the <strong>LUPPO BMI System</strong> has been created by an administrator.</p>
          <table cellpadding="8" style="border-collapse:collapse;">
            <tr><td><strong>Badge Number</strong></td><td>${opts.badgeNumber}</td></tr>
            <tr><td><strong>Email</strong></td><td>${opts.to}</td></tr>
            <tr><td><strong>Temporary Password</strong></td><td><code style="background:#f4f4f4;padding:2px 6px;border-radius:4px;">${opts.tempPassword}</code></td></tr>
          </table>
          <p style="margin-top:16px;">You will be required to change your password upon first login.</p>
          <br>
          <p><em>La Union Provincial Police Office — BMI System</em></p>
        `,
      }),
    });
  } catch (err) {
    logger.error("email", "Failed to send welcome email", { error: String(err) });
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function fetchUsers(
  params: { page: number; limit: number; search: string; role: string; station: string }
): Promise<UsersResult> {
  const parsed = UserSearchSchema.safeParse(params);
  if (!parsed.success)
    return { data: [], count: 0, error: parsed.error.issues[0].message };

  let admin;
  try { admin = getAdminClient(); } catch {
    return { data: [], count: 0, error: "Failed to connect to the database." };
  }

  const { page, limit, search, role, station } = parsed.data;
  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin
    .from("profiles")
    .select("*", { count: "exact" })
    .is("archived_at", null);

  if (search)  query = query.or(`badge_number.ilike.%${search}%,full_name.ilike.%${search}%`);
  if (role)    query = query.eq("role", role);
  if (station) query = query.eq("unit_station", station);

  const { data, count, error } = await query.order("last_name").range(from, to);
  if (error) return { data: [], count: 0, error: "Failed to load users." };
  return { data: (data ?? []) as Profile[], count: count ?? 0 };
}

export async function fetchArchivedUsers(
  params: { page: number; limit: number; search: string }
): Promise<UsersResult> {
  const parsed = ArchivedUserSearchSchema.safeParse(params);
  if (!parsed.success)
    return { data: [], count: 0, error: parsed.error.issues[0].message };

  let admin;
  try { admin = getAdminClient(); } catch {
    return { data: [], count: 0, error: "Failed to connect to the database." };
  }

  const { page, limit, search } = parsed.data;
  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin
    .from("profiles")
    .select("*", { count: "exact" })
    .not("archived_at", "is", null);

  if (search) query = query.or(`badge_number.ilike.%${search}%,full_name.ilike.%${search}%`);

  const { data, count, error } = await query
    .order("archived_at", { ascending: false })
    .range(from, to);

  if (error) return { data: [], count: 0, error: "Failed to load archived users." };
  return { data: (data ?? []) as Profile[], count: count ?? 0 };
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createUser(
  rawPayload: CreateUserPayload
): Promise<{ error?: string; email?: string }> {
  return withActionGuard(async () => {
    const { userId: actorId } = await requireSystemAdmin();

    const parsed = CreateUserSchema.safeParse(rawPayload);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const payload = parsed.data;

    const admin       = getAdminClient();
    const tempPassword = generatePassword();

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email:         payload.email,
        password:      tempPassword,
        email_confirm: true,
      });

    if (authError) {
      logger.error("auth", "createUser auth failed", { error: authError.message });
      return { error: "Failed to create account. The email address may already be in use." };
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id:                       authData.user.id,
      badge_number:             payload.badge_number,
      first_name:               payload.first_name,
      middle_name:              payload.middle_name || null,
      last_name:                payload.last_name,
      qualifier:                payload.qualifier || null,
      full_name:                buildFullName(payload),
      gender:                   payload.gender,
      birthdate:                payload.birthdate,
      rank:                     payload.rank || null,
      unit_station:             payload.unit_station,
      email:                    payload.email,
      role:                     payload.role,
      requires_password_change: true,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      logger.error("action", "createUser profile insert failed", { error: profileError.message });
      return { error: "Failed to save user profile. Please try again." };
    }

    await sendWelcomeEmail({
      to:           payload.email,
      badgeNumber:  payload.badge_number,
      fullName:     buildFullName(payload),
      tempPassword,
    });

    audit("user.created", actorId, {
      targetEmail: payload.email,
      targetBadge: payload.badge_number,
      role:        payload.role,
    });

    revalidatePath("/dashboard/sys-admin/users");
    return { email: payload.email };
  });
}

export async function updateUser(
  id:         string,
  rawPayload: UpdateUserPayload
): Promise<{ error?: string }> {
  return withActionGuard(async () => {
    const { userId: actorId } = await requireSystemAdmin();

    const idParsed = UuidSchema.safeParse(id);
    if (!idParsed.success) return { error: "Invalid user ID." };

    const parsed = UpdateUserSchema.safeParse(rawPayload);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const payload = parsed.data;

    const admin = getAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({
        first_name:   payload.first_name,
        middle_name:  payload.middle_name || null,
        last_name:    payload.last_name,
        qualifier:    payload.qualifier || null,
        full_name:    buildFullName(payload),
        gender:       payload.gender,
        birthdate:    payload.birthdate,
        rank:         payload.rank || null,
        unit_station: payload.unit_station,
        role:         payload.role,
      })
      .eq("id", idParsed.data);

    if (error) throw error;

    audit("user.updated", actorId, { targetId: id });
    revalidatePath("/dashboard/sys-admin/users");
    return {};
  });
}

export async function archiveUser(id: string): Promise<{ error?: string }> {
  return withActionGuard(async () => {
    const { userId: actorId } = await requireSystemAdmin();

    const idParsed = UuidSchema.safeParse(id);
    if (!idParsed.success) return { error: "Invalid user ID." };

    const admin = getAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", idParsed.data);

    if (error) throw error;

    audit("user.archived", actorId, { targetId: id });
    revalidatePath("/dashboard/sys-admin/users");
    return {};
  });
}

export async function restoreUser(id: string): Promise<{ error?: string }> {
  return withActionGuard(async () => {
    const { userId: actorId } = await requireSystemAdmin();

    const idParsed = UuidSchema.safeParse(id);
    if (!idParsed.success) return { error: "Invalid user ID." };

    const admin = getAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ archived_at: null })
      .eq("id", idParsed.data);

    if (error) throw error;

    audit("user.restored", actorId, { targetId: id });
    revalidatePath("/dashboard/sys-admin/users");
    return {};
  });
}
