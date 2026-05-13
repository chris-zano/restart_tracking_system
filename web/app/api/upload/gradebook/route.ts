/**
 * Parses a Canvas gradebook CSV uploaded by the instructor.
 *
 * Canvas gradebook layout:
 *   row 1     headers (Student, ID, SIS Login ID, Section, <assignment 1>, …)
 *   row 2     "Points Possible" pseudo-row  ← we drop this
 *   row 3+    one row per learner; cells are numeric scores or empty
 *
 * Returns:
 *   {
 *     learners: GradebookRow[],
 *     assignments: string[]   // assignment column names in source order
 *   }
 *
 * The client buckets each assignment into its weekly target by matching the
 * column name against `WeeklyTargetResponse.labs` and `.knowledgeChecks` for
 * the cohort's track. Anything that doesn't match goes into a "Unassigned"
 * bucket the UI surfaces separately.
 *
 * NOTHING IS PERSISTED. When the backend ships an assignment-report endpoint,
 * delete this route handler and replace with a Server Action that proxies the
 * CSV (or pre-parsed rows) to your endpoint.
 */
import { NextResponse } from "next/server";
import Papa from "papaparse";
import type { GradebookRow } from "@/lib/types";
import { getSession } from "@/lib/auth";

const SKIP_COLS = new Set(["student", "id", "sis user id", "sis login id", "section"]);

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
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });

  const rows = parsed.data;
  if (rows.length < 2) return NextResponse.json({ learners: [], assignments: [] });

  const headers = rows[0].map((h) => h.trim());
  // Drop the "Points Possible" row if present
  const dataRows = rows.slice(1).filter((r) => r[0]?.toLowerCase() !== "    points possible" && r[0]?.toLowerCase() !== "points possible");

  const assignmentCols = headers.map((h, i) => ({ h, i })).filter(({ h }) => !SKIP_COLS.has(h.toLowerCase()) && h !== "");
  const studentIdx = headers.findIndex((h) => h.toLowerCase() === "student");
  const emailIdx   = headers.findIndex((h) => /sis login|email/i.test(h));

  const assignments = assignmentCols.map((c) => c.h);

  const learners: GradebookRow[] = dataRows.map((r) => {
    const scores: Record<string, string | number | null> = {};
    for (const c of assignmentCols) {
      const cell = r[c.i] ?? "";
      const n = cell.trim() === "" ? null : Number(cell);
      scores[c.h] = Number.isFinite(n) ? (n as number) : (cell === "" ? null : cell);
    }
    return {
      learnerName: r[studentIdx]?.trim() ?? "",
      email: emailIdx >= 0 ? r[emailIdx]?.trim() : undefined,
      scores,
    };
  }).filter((l) => l.learnerName && l.learnerName.toLowerCase() !== "test student");

  return NextResponse.json({ learners, assignments });
}
