import { createClient } from "@/lib/supabase/server";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("bmi_reports")
    .select("status");

  const counts = { Underweight: 0, Normal: 0, Overweight: 0, Obese: 0 };
  (reports ?? []).forEach((r) => {
    if (r.status in counts) counts[r.status as keyof typeof counts]++;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const stats = [
    { label: "Total Officers", value: userCount ?? 0, color: "text-blue-700" },
    { label: "Total Records", value: total, color: "text-gray-700" },
    { label: "Normal", value: counts.Normal, color: "text-green-600" },
    { label: "Overweight", value: counts.Overweight, color: "text-yellow-600" },
    { label: "Obese", value: counts.Obese, color: "text-red-600" },
    { label: "Underweight", value: counts.Underweight, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Office Health Overview</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-6 shadow">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`mt-1 text-4xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
