import Link from "next/link";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AssessmentWithOfficer } from "@/lib/types";
import { getPNPStatusColor } from "@/lib/bmi";
import type { PNPStatus } from "@/lib/bmi";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

export default async function PendingAssessmentsPage() {
  const admin = getAdminClient();

  const { data: assessments, error } = await admin
    .from("bmi_assessments")
    .select("*")
    .eq("status", "pending_approval")
    .order("submitted_at", { ascending: true });

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <strong>Failed to load assessments:</strong> {error.message}
      </div>
    );
  }

  const userIds = [...new Set((assessments ?? []).map((a) => a.user_id))];
  const officers =
    userIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, full_name, badge_number, rank, unit_station, gender, birthdate")
          .in("id", userIds)
          .then(({ data }) => data ?? [])
      : [];

  const officerMap = new Map(officers.map((o) => [o.id, o]));

  const rows: AssessmentWithOfficer[] = (assessments ?? []).map((a) => ({
    ...a,
    officer: officerMap.get(a.user_id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">BMI Assessment Review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {rows.length} submission{rows.length !== 1 ? "s" : ""} pending review
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Officer</TableHead>
              <TableHead>Badge #</TableHead>
              <TableHead>Unit / Station</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">BMI</TableHead>
              <TableHead>PNP Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No pending assessments.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium uppercase text-sm">
                        {row.officer?.rank ? `${row.officer.rank.toUpperCase()} ` : ""}
                        {row.officer?.full_name ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {row.officer?.badge_number ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.officer?.unit_station ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.submitted_at
                      ? new Date(row.submitted_at).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {row.bmi_score.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getPNPStatusColor(row.bmi_pnp_status as PNPStatus)}
                    >
                      {row.bmi_pnp_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/system_admin/assessments/${row.id}`}>
                        <ExternalLink className="size-3.5 mr-1" />
                        Open
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
