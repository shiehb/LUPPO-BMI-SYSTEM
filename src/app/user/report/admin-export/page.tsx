import { redirect } from "next/navigation";

export default function AdminExportPage() {
  redirect("/dashboard/reports/export");
}
