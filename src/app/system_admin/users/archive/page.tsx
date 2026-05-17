import { redirect } from "next/navigation";

export default function ArchivedAccountsPage() {
  redirect("/dashboard/sys-admin/users/archived");
}
