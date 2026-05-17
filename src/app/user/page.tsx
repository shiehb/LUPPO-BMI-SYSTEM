import { redirect } from "next/navigation";

export default function UserPage() {
  redirect("/dashboard/my-profile");
}
