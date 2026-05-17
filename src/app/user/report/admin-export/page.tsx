import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminExportUI from "./AdminExportUI";

export const metadata = {
  title: "All Assessments — Admin Export",
};

export default async function AdminExportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "system_admin") redirect("/user/report");

  return <AdminExportUI />;
}
