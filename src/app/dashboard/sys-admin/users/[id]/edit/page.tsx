import { notFound } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { EditUserForm } from "@/app/system_admin/users/edit/[id]/EditUserForm";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = getAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single<Profile>();

  if (!profile) notFound();

  return <EditUserForm profile={profile} />;
}
