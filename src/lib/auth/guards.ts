import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/types";

export interface AuthContext {
  userId: string;
  role:   Role;
}

export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_approved")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("UNAUTHENTICATED");
  if (!profile.is_approved && profile.role !== "system_admin") throw new Error("PENDING_APPROVAL");
  return { userId: user.id, role: profile.role as Role };
}

export async function requireRole(...roles: Role[]): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!roles.includes(ctx.role)) throw new Error("FORBIDDEN");
  return ctx;
}

export async function requireSystemAdmin(): Promise<AuthContext> {
  return requireRole("system_admin");
}

export async function requireAdmin(): Promise<AuthContext> {
  return requireRole("system_admin", "admin");
}

export function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey)
    throw new Error("Server configuration error. Please contact support.");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
