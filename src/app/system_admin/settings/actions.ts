"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface RankEntry { id: string; name: string; }
export interface UnitEntry { id: string; name: string; }

// ── Auth guard ────────────────────────────────────────────────────────────────

async function requireSystemAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "system_admin") throw new Error("Access denied.");
  return supabase;
}

// ── Read (public — used by forms for all roles including unauthenticated signup) ──

export async function fetchRanks(): Promise<RankEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ranks")
    .select("id, name")
    .order("name");
  return (data ?? []) as RankEntry[];
}

export async function fetchUnits(): Promise<UnitEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("id, name")
    .order("name");
  return (data ?? []) as UnitEntry[];
}

export async function fetchRankNames(): Promise<string[]> {
  const rows = await fetchRanks();
  return rows.map((r) => r.name);
}

export async function fetchUnitNames(): Promise<string[]> {
  const rows = await fetchUnits();
  return rows.map((u) => u.name);
}

// ── Ranks CRUD ────────────────────────────────────────────────────────────────

export async function addRank(name: string): Promise<{ error?: string }> {
  try {
    const supabase = await requireSystemAdmin();
    const trimmed = name.trim();
    if (!trimmed) return { error: "Name is required." };
    const { error } = await supabase.from("ranks").insert({ name: trimmed });
    if (error) return { error: error.message };
    revalidatePath("/system_admin/settings");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateRank(
  id: string,
  name: string
): Promise<{ error?: string }> {
  try {
    const supabase = await requireSystemAdmin();
    const trimmed = name.trim();
    if (!trimmed) return { error: "Name is required." };
    const { error } = await supabase
      .from("ranks")
      .update({ name: trimmed })
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/system_admin/settings");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteRank(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await requireSystemAdmin();

    // Fetch the name first so we can check usage
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
      if (count && count > 0) {
        return {
          error: `Cannot delete: ${count} profile${count > 1 ? "s" : ""} currently use this rank.`,
        };
      }
    }

    const { error } = await supabase.from("ranks").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/system_admin/settings");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ── Units CRUD ────────────────────────────────────────────────────────────────

export async function addUnit(name: string): Promise<{ error?: string }> {
  try {
    const supabase = await requireSystemAdmin();
    const trimmed = name.trim();
    if (!trimmed) return { error: "Name is required." };
    const { error } = await supabase.from("units").insert({ name: trimmed });
    if (error) return { error: error.message };
    revalidatePath("/system_admin/settings");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateUnit(
  id: string,
  name: string
): Promise<{ error?: string }> {
  try {
    const supabase = await requireSystemAdmin();
    const trimmed = name.trim();
    if (!trimmed) return { error: "Name is required." };
    const { error } = await supabase
      .from("units")
      .update({ name: trimmed })
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/system_admin/settings");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteUnit(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await requireSystemAdmin();

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
      if (count && count > 0) {
        return {
          error: `Cannot delete: ${count} profile${count > 1 ? "s" : ""} currently use this unit/station.`,
        };
      }
    }

    const { error } = await supabase.from("units").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/system_admin/settings");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
