import { redirect } from "next/navigation";

/**
 * Legacy route — kept for backward compatibility with email links and bookmarks.
 * All new internal navigation uses /add, /edit/[id], and /review/[id] directly.
 */
export default async function LegacyNewAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (id) redirect(`/user/assessment/edit/${id}`);
  redirect("/user/assessment/add");
}
