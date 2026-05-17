import { redirect } from "next/navigation";

export default async function EditAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/my-profile/${id}/edit`);
}
