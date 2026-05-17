import { redirect } from "next/navigation";

/**
 * The global personnel-list reports view has been removed.
 * All roles — including system_admin — are redirected to their own
 * individual BMI report where the query is strictly scoped to the
 * session user's ID.
 */
export default function AdminReportsPage() {
  redirect("/user/report");
}
