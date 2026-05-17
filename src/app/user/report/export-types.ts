/**
 * Shared types and rank-sorting utilities used by both the
 * AdminExportPanel (client) and the CSV API route (server).
 *
 * Keep this file free of "use client" / "use server" directives
 * so it can be safely imported from either context.
 */

/* ── RANK HIERARCHY ───────────────────────────────────────────────────────── */
// Ordered from highest (index 0) to lowest (index 11).

export const RANK_ORDER: readonly string[] = [
  "PCOL",    // Police Colonel
  "PLTCOL",  // Police Lieutenant Colonel
  "PMAJ",    // Police Major
  "PCPT",    // Police Captain
  "PLT",     // Police Lieutenant
  "PEMS",    // Police Executive Master Sergeant
  "PCMS",    // Police Chief Master Sergeant
  "PMSg",    // Police Master Sergeant
  "SSg",     // Police Staff Sergeant
  "Cpl",     // Police Corporal
  "Pat",     // Police Patrolman / Patrolwoman
  "NUP",     // Non-Uniformed Personnel / Civilian staff
] as const;

/**
 * Returns the sort priority of a rank string (lower index = higher rank).
 * Comparison is case-insensitive. Unknown / null ranks sort after NUP.
 */
export function rankPriority(rank: string | null | undefined): number {
  if (!rank) return RANK_ORDER.length + 1;
  const normalized = rank.trim().toLowerCase();
  const idx = RANK_ORDER.findIndex((r) => r.toLowerCase() === normalized);
  return idx === -1 ? RANK_ORDER.length : idx;
}

/**
 * Stable sort: primary key = rank (high → low), secondary key = lastName (A → Z).
 * Returns a new array; original is not mutated.
 */
export function sortByRank<T extends { rank: string; lastName: string }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    const diff = rankPriority(a.rank) - rankPriority(b.rank);
    if (diff !== 0) return diff;
    return a.lastName.localeCompare(b.lastName, "en", { sensitivity: "base" });
  });
}

/* ── EXPORT ROW SCHEMA ────────────────────────────────────────────────────── */
// Column order matches the exact layout required for the CSV export.

export interface ExportRow {
  rank:            string;
  lastName:        string;
  firstName:       string;
  middleName:      string;
  qualifier:       string;        // "Jr.", "Sr.", "II", etc.
  badgeNumber:     string;
  unit:            string;
  age:             number | null;
  gender:          string;
  heightM:         number | null; // metres (e.g. 1.73)
  weightKg:        number | null;
  waistCm:         number | null;
  wristCm:         number | null;
  hipCm:           number | null;
  weightToLose:    number | null; // kg; 0 = within normal range
  bmiScore:        number | null;
  normalWeightMin: number | null;
  normalWeightMax: number | null;
  // UI-only field: not included in CSV export
  assessmentId:    string | null;
}

/* ── CSV COLUMN MAP ───────────────────────────────────────────────────────── */
// Defines the exact header labels and the decimal precision for each field.

export interface CsvColumn {
  header:    string;
  field:     keyof ExportRow;
  decimals?: number; // if set, Number.toFixed(decimals) is applied
}

export const CSV_COLUMNS: CsvColumn[] = [
  { header: "Rank",                   field: "rank"            },
  { header: "Last Name",              field: "lastName"        },
  { header: "First Name",             field: "firstName"       },
  { header: "Middle Name",            field: "middleName"      },
  { header: "Qual",                   field: "qualifier"       },
  { header: "Badge Number",           field: "badgeNumber"     },
  { header: "UNIT",                   field: "unit"            },
  { header: "AGE",                    field: "age"             },
  { header: "GENDER",                 field: "gender"          },
  { header: "HEIGHT (Meter)",         field: "heightM",        decimals: 2 },
  { header: "Weight",                 field: "weightKg"        },
  { header: "WAIST (cm)",             field: "waistCm"         },
  { header: "WRIST (cm)",             field: "wristCm"         },
  { header: "HIP (cm)",               field: "hipCm"           },
  { header: "Weight to Lose (KGs)",   field: "weightToLose",   decimals: 2 },
  { header: "BMI RESULT",             field: "bmiScore",       decimals: 2 },
  { header: "Normal Weight Minimum",  field: "normalWeightMin", decimals: 1 },
  { header: "Normal Weight Maximum",  field: "normalWeightMax", decimals: 1 },
];
