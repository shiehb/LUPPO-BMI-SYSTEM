import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/auth/guards";
import {
  sortByRank,
  CSV_COLUMNS,
  type ExportRow,
} from "@/app/user/report/export-types";

/* ── HELPERS ──────────────────────────────────────────────────────────────── */

function calculateAge(birthdate: string | null): number | null {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function lastDayOfMonth(year: number, month: number): string {
  return new Date(year, month, 0).toISOString().split("T")[0];
}

/* ── CSV BUILDER ──────────────────────────────────────────────────────────── */

function escapeField(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  // RFC 4180: wrap fields that contain commas, quotes, or line breaks.
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCell(col: typeof CSV_COLUMNS[number], row: ExportRow): string {
  const raw = row[col.field];
  if (raw === null || raw === undefined || raw === "") return "";
  if (typeof raw === "number" && col.decimals !== undefined) {
    return escapeField(raw.toFixed(col.decimals));
  }
  return escapeField(raw);
}

function buildCSV(rows: ExportRow[]): string {
  const headerLine = CSV_COLUMNS.map((c) => escapeField(c.header)).join(",");
  const dataLines  = rows.map((row) =>
    CSV_COLUMNS.map((col) => formatCell(col, row)).join(",")
  );
  return [headerLine, ...dataLines].join("\r\n");
}

/* ── DATA FETCH + RANK SORT ───────────────────────────────────────────────── */

async function fetchExportRows(year: number, month: number | null): Promise<ExportRow[]> {
  const admin = getAdminClient();

  const startDate = month
    ? `${year}-${String(month).padStart(2, "0")}-01`
    : `${year}-01-01`;
  const endDate = month ? lastDayOfMonth(year, month) : `${year}-12-31`;

  const [{ data: profiles }, { data: assessments }] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, badge_number, last_name, first_name, middle_name, qualifier, rank, unit_station, gender, birthdate"
      )
      .is("archived_at", null)
      .order("last_name", { ascending: true }), // secondary sort; primary is rank (applied below)
    admin
      .from("bmi_assessments")
      .select(
        "id, user_id, weight, height, waist, wrist, hip, weight_to_lose, bmi_score, normal_weight_min, normal_weight_max, date_taken"
      )
      .gte("date_taken", startDate)
      .lte("date_taken", endDate)
      .neq("status", "draft"),
  ]);

  const assessmentMap = new Map(
    (assessments ?? []).map((a) => [a.user_id as string, a])
  );

  const rows: ExportRow[] = (profiles ?? []).map((p) => {
    const a = assessmentMap.get(p.id);
    return {
      rank:            p.rank            ?? "",
      lastName:        p.last_name       ?? "",
      firstName:       p.first_name      ?? "",
      middleName:      p.middle_name     ?? "",
      qualifier:       p.qualifier       ?? "",
      badgeNumber:     p.badge_number    ?? "",
      unit:            p.unit_station    ?? "",
      age:             calculateAge(p.birthdate ?? null),
      gender:          p.gender          ?? "",
      heightM:         a ? Number(a.height)                             : null,
      weightKg:        a ? Number(a.weight)                             : null,
      waistCm:         a ? (a.waist  !== null ? Number(a.waist)  : null) : null,
      wristCm:         a ? (a.wrist  !== null ? Number(a.wrist)  : null) : null,
      hipCm:           a ? (a.hip    !== null ? Number(a.hip)    : null) : null,
      weightToLose:    a ? Number(a.weight_to_lose)                     : null,
      bmiScore:        a ? Number(a.bmi_score)                          : null,
      normalWeightMin: a ? Number(a.normal_weight_min)                  : null,
      normalWeightMax: a ? Number(a.normal_weight_max)                  : null,
      assessmentId:    a ? (a.id as string)                             : null,
    } satisfies ExportRow;
  });

  // Primary sort: rank hierarchy (PCOL → NUP → unknown).
  // Secondary sort (tiebreaker): lastName A–Z.
  return sortByRank(rows);
}

/* ── MONTH LABELS ─────────────────────────────────────────────────────────── */

const MONTH_LABEL = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

/* ── ROUTE HANDLER ────────────────────────────────────────────────────────── */

export async function GET(request: NextRequest) {

  /* ── 1. Verify Supabase session ─────────────────────────────────────── */
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ── 2. Verify system_admin role ────────────────────────────────────── */
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "system_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* ── 3. Parse & validate query params ──────────────────────────────── */
  const { searchParams } = request.nextUrl;

  const rawYear  = searchParams.get("year");
  const rawMonth = searchParams.get("month");
  const format   = searchParams.get("format") ?? "csv"; // "json" | "csv"

  const now  = new Date();
  const year = rawYear ? Number(rawYear) : now.getFullYear();
  if (!Number.isInteger(year) || year < 2023 || year > now.getFullYear() + 1) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });
  }

  const month = rawMonth && rawMonth !== "all" ? Number(rawMonth) : null;
  if (month !== null && (!Number.isInteger(month) || month < 1 || month > 12)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }

  /* ── 4. Fetch & sort data ───────────────────────────────────────────── */
  let rows: ExportRow[];
  try {
    rows = await fetchExportRows(year, month);
  } catch (err) {
    console.error("[export-all-bmi-csv] fetch error:", err);
    return NextResponse.json({ error: "Data fetch failed." }, { status: 500 });
  }

  /* ── 5. Respond: JSON preview or CSV download ───────────────────────── */
  if (format === "json") {
    return NextResponse.json(rows);
  }

  const csv        = buildCSV(rows);
  const monthLabel = month ? MONTH_LABEL[month - 1] : "All_Months";
  const filename   = `Master_BMI_Export_${year}_${monthLabel}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}
