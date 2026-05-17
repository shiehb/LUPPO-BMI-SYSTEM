import { redirect } from "next/navigation";

export default function AdminUsersPage() {
  redirect("/dashboard/sys-admin/users");
}
