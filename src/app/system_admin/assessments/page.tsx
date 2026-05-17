import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function BmiResultsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const qs = params.month ? `?month=${params.month}` : "";
  redirect(`/dashboard/personnel${qs}`);
}
