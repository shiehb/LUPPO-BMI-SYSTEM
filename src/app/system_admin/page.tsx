import { redirect } from "next/navigation";

export default function AdminRootPage() {
  redirect("/system_admin/assessments");
}
