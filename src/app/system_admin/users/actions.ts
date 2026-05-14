"use server";

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { Profile, Role } from "@/lib/types";

export interface UsersResult {
  data: Profile[];
  count: number;
  error?: string;
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function fetchUsers(params: {
  page: number;
  limit: number;
  search: string;
  role: string;
  station: string;
}): Promise<UsersResult> {
  let supabase;
  try { supabase = getAdminClient(); } catch (e) {
    return { data: [], count: 0, error: (e as Error).message };
  }
  const { page, limit, search, role, station } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .is("archived_at", null); // active users only

  if (search.trim()) {
    query = query.or(
      `badge_number.ilike.%${search}%,full_name.ilike.%${search}%`
    );
  }
  if (role)    query = query.eq("role", role);
  if (station) query = query.eq("unit_station", station);

  const { data, count, error } = await query
    .order("last_name")
    .range(from, to);

  if (error) return { data: [], count: 0, error: error.message };
  return { data: (data ?? []) as Profile[], count: count ?? 0 };
}

export async function fetchArchivedUsers(params: {
  page: number;
  limit: number;
  search: string;
}): Promise<UsersResult> {
  let supabase;
  try { supabase = getAdminClient(); } catch (e) {
    return { data: [], count: 0, error: (e as Error).message };
  }
  const { page, limit, search } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .not("archived_at", "is", null); // archived users only

  if (search.trim()) {
    query = query.or(
      `badge_number.ilike.%${search}%,full_name.ilike.%${search}%`
    );
  }

  const { data, count, error } = await query
    .order("archived_at", { ascending: false })
    .range(from, to);

  if (error) return { data: [], count: 0, error: error.message };
  return { data: (data ?? []) as Profile[], count: count ?? 0 };
}

// ── Shared payload types ─────────────────────────────────────────────────────

interface PersonalFields {
  first_name: string;
  middle_name: string;
  last_name: string;
  qualifier: string;
  gender: "Male" | "Female";
  birthdate: string;
}

interface ServiceFields {
  badge_number: string;
  rank: string;
  unit_station: string;
}

export type CreateUserPayload = PersonalFields &
  ServiceFields & {
    email: string;
    role: Role;
  };

// badge_number is excluded — it is immutable after creation
export type UpdateUserPayload = PersonalFields & {
  rank: string;
  unit_station: string;
  role: Role;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildFullName(p: PersonalFields): string {
  return [p.first_name, p.middle_name, p.last_name, p.qualifier]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}

function generatePassword(): string {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  return Array.from(crypto.randomBytes(14))
    .map((b) => charset[b % charset.length])
    .join("");
}

async function sendWelcomeEmail(opts: {
  to: string;
  badgeNumber: string;
  fullName: string;
  tempPassword: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[createUser] RESEND_API_KEY not set — skipping welcome email.");
    return;
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "noreply@luppo.gov.ph",
        to: [opts.to],
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
    console.error("[createUser] Failed to send welcome email:", err);
  }
}

/** Returns a Supabase admin client. Throws a user-friendly error if the key is missing. */
function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

// ── Actions ──────────────────────────────────────────────────────────────────

/**
 * Creates a Supabase Auth user + profile row.
 * Auto-generates a secure temporary password and emails it to the user.
 * Requires SUPABASE_SERVICE_ROLE_KEY (and optionally RESEND_API_KEY) in env.
 */
export async function createUser(
  payload: CreateUserPayload
): Promise<{ error?: string; email?: string }> {
  let admin;
  try { admin = getAdminClient(); } catch (e) {
    return { error: (e as Error).message };
  }

  const tempPassword = generatePassword();

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: payload.email,
      password: tempPassword,
      email_confirm: true,
    });

  if (authError) return { error: authError.message };

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    badge_number: payload.badge_number,
    first_name: payload.first_name,
    middle_name: payload.middle_name || null,
    last_name: payload.last_name,
    qualifier: payload.qualifier || null,
    full_name: buildFullName(payload),
    gender: payload.gender,
    birthdate: payload.birthdate,
    rank: payload.rank || null,
    unit_station: payload.unit_station,
    email: payload.email,
    role: payload.role,
    requires_password_change: true,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  await sendWelcomeEmail({
    to: payload.email,
    badgeNumber: payload.badge_number,
    fullName: buildFullName(payload),
    tempPassword,
  });

  revalidatePath("/system_admin/users");
  return { email: payload.email };
}

export async function updateUser(
  id: string,
  payload: UpdateUserPayload
): Promise<{ error?: string }> {
  let supabase;
  try { supabase = getAdminClient(); } catch (e) {
    return { error: (e as Error).message };
  }
  const { error } = await supabase
    .from("profiles")
    .update({
      // badge_number intentionally excluded — immutable after creation
      first_name: payload.first_name,
      middle_name: payload.middle_name || null,
      last_name: payload.last_name,
      qualifier: payload.qualifier || null,
      full_name: buildFullName(payload),
      gender: payload.gender,
      birthdate: payload.birthdate,
      rank: payload.rank || null,
      unit_station: payload.unit_station,
      role: payload.role,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/system_admin/users");
  return {};
}

/**
 * Soft-deletes a user by stamping archived_at.
 * Uses service role to bypass RLS — requires SUPABASE_SERVICE_ROLE_KEY.
 *
 * DB migration (run once):
 *   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
 */
export async function archiveUser(id: string): Promise<{ error?: string }> {
  let admin;
  try { admin = getAdminClient(); } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await admin
    .from("profiles")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/system_admin/users");
  return {};
}

/**
 * Restores an archived user by clearing archived_at.
 * Uses service role to bypass RLS — requires SUPABASE_SERVICE_ROLE_KEY.
 */
export async function restoreUser(id: string): Promise<{ error?: string }> {
  let admin;
  try { admin = getAdminClient(); } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await admin
    .from("profiles")
    .update({ archived_at: null })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/system_admin/users");
  return {};
}
