/**
 * Parses a Zoom participants CSV uploaded by the instructor.
 *
 * The Zoom export has many columns (email, join time, leave time, role, etc.)
 * but we only care about the participant **name** and **total duration**.
 * Different Zoom locales / report types use slightly different column names —
 * we accept any of the common variants.
 *
 * Returns: ZoomCsvRow[]  → { name, duration }
 *
 * Nothing is persisted. The client receives the rows, runs name-matching
 * against the cohort's learners (with manual fallback), then submits a clean
 * `participants[]` payload to POST /api/instructor/attendance via the
 * recordAttendance Server Action.
 */
import { NextResponse } from "next/server";
import Papa from "papaparse";
import type { ZoomCsvRow } from "@/lib/types";
import { getSession } from "@/lib/auth";

const NAME_KEYS = ["name (original name)", "name", "user name", "username", "name (display)"];
const DURATION_KEYS = ["total duration (minutes)", "duration (minutes)", "duration", "total duration"];

const pick = (row: Record<string, string>, keys: string[]) => {
  const map = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]));
  for (const k of keys) if (map[k] !== undefined && map[k] !== "") return map[k];
  return undefined;
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rows: ZoomCsvRow[] = [];
  for (const r of parsed.data) {
    const name = pick(r, NAME_KEYS);
    const dur = pick(r, DURATION_KEYS);
    if (!name) continue;
    const minutes = dur ? Math.round(Number(dur)) : 0;
    if (!Number.isFinite(minutes)) continue;
    rows.push({ name: name.trim().replace(/\s*\([^)]*\)\s*$/, "").trim(), duration: minutes });
  }

  return NextResponse.json({ rows });
}
