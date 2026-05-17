import { redirect } from "next/navigation";

export default async function LegacyNewAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (id) redirect(`/dashboard/my-profile/${id}/edit`);
  redirect("/dashboard/my-profile/new");
}
