import { redirect } from "next/navigation";

export default function AddUserPage() {
  redirect("/dashboard/sys-admin/users/new");
}
