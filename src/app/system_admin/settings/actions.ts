"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireSystemAdmin } from "@/lib/auth/guards";
import { RankUnitNameSchema } from "@/lib/validation/schemas";
import { withActionGuard } from "@/lib/errors";
import { audit } from "@/lib/logger";

export interface RankEntry { id: string; name: string; }
export interface UnitEntry { id: string; name: string; }

// ── Read (public — used by forms for all roles including unauthenticated signup) ──

export async function fetchRanks(): Promise<RankEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("ranks").select("id, name").order("name");
  return (data ?? []) as RankEntry[];
}

export async function fetchUnits(): Promise<UnitEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("units").select("id, name").order("name");
  return (data ?? []) as UnitEntry[];
}

export async function fetchRankNames(): Promise<string[]> {
  return (await fetchRanks()).map((r) => r.name);
}

export async function fetchUnitNames(): Promise<string[]> {
  return (await fetchUnits()).map((u) => u.name);
}

// ── Ranks CRUD ────────────────────────────────────────────────────────────────

export async function addRank(name: string): Promise<{ error?: string }> {
  return withActionGuard(async () => {
    const { userId } = await requireSystemAdmin();

    const parsed = RankUnitNameSchema.safeParse(name);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const { error } = await supabase.from("ranks").insert({ name: parsed.data });
    if (error) {
      if (error.code === "23505") return { error: "A rank with that name already exists." };
      throw error;
    }

    audit("rank.created", userId, { name: parsed.data });
    revalidatePath("/system_admin/settings");
    return {};
  });
}

export async function updateRank(id: string, name: string): Promise<{ error?: string }> {
  return withActionGuard(async () => {
    await requireSystemAdmin();

    const parsed = RankUnitNameSchema.safeParse(name);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const { error } = await supabase.from("ranks").update({ name: parsed.data }).eq("id", id);
    if (error) {
      if (error.code === "23505") return { error: "A rank with that name already exists." };
      throw error;
    }

    revalidatePath("/system_admin/settings");
    return {};
  });
}

export async function deleteRank(id: string): Promise<{ error?: string }> {
  return withActionGuard(async () => {
    const { userId } = await requireSystemAdmin();
    const supabase = await createClient();

    const { data: rank } = await supabase
      .from("ranks")
      .select("name")
      .eq("id", id)
      .single();

    if (rank?.name) {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("rank", rank.name);
      if (count && count > 0)
        return { error: `Cannot delete: ${count} profile${count > 1 ? "s" : ""} currently use this rank.` };
    }

    const { error } = await supabase.from("ranks").delete().eq("id", id);
    if (error) throw error;

    audit("rank.deleted", userId, { rankId: id, name: rank?.name });
    revalidatePath("/system_admin/settings");
    return {};
  });
}

// ── Units CRUD ────────────────────────────────────────────────────────────────

export async function addUnit(name: string): Promise<{ error?: string }> {
  return withActionGuard(async () => {
    const { userId } = await requireSystemAdmin();

    const parsed = RankUnitNameSchema.safeParse(name);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const { error } = await supabase.from("units").insert({ name: parsed.data });
    if (error) {
      if (error.code === "23505") return { error: "A unit with that name already exists." };
      throw error;
    }

    audit("unit.created", userId, { name: parsed.data });
    revalidatePath("/system_admin/settings");
    return {};
  });
}

export async function updateUnit(id: string, name: string): Promise<{ error?: string }> {
  return withActionGuard(async () => {
    await requireSystemAdmin();

    const parsed = RankUnitNameSchema.safeParse(name);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const { error } = await supabase.from("units").update({ name: parsed.data }).eq("id", id);
    if (error) {
      if (error.code === "23505") return { error: "A unit with that name already exists." };
      throw error;
    }

    revalidatePath("/system_admin/settings");
    return {};
  });
}

export async function deleteUnit(id: string): Promise<{ error?: string }> {
  return withActionGuard(async () => {
    const { userId } = await requireSystemAdmin();
    const supabase = await createClient();

    const { data: unit } = await supabase
      .from("units")
      .select("name")
      .eq("id", id)
      .single();

    if (unit?.name) {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("unit_station", unit.name);
      if (count && count > 0)
        return { error: `Cannot delete: ${count} profile${count > 1 ? "s" : ""} currently use this unit/station.` };
    }

    const { error } = await supabase.from("units").delete().eq("id", id);
    if (error) throw error;

    audit("unit.deleted", userId, { unitId: id, name: unit?.name });
    revalidatePath("/system_admin/settings");
    return {};
  });
}
