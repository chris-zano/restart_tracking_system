"use client";

/**
 * Assignment Report
 * ─────────────────
 * 1. Instructor selects cohort + uploads Canvas gradebook CSV.
 * 2. CSV is parsed by the Next.js API route (/api/upload/gradebook).
 * 3. Parsed rows are sent to POST /api/instructor/progress/report via a
 *    Server Action. The backend matches learners and buckets items into
 *    weekly targets for the cohort's track.
 * 4. Results are displayed as per-learner accordion with week-by-week breakdown.
 */

import { useState, useTransition, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { generateProgressReport, getSavedProgressReport } from "@/app/actions";
import type {
  GradebookRow, WeeklyTargetResponse, TrackResponse, CohortResponse, LearnerResponse,
  ProgressReportResponse, WeekProgress,
} from "@/lib/types";

export function AssignmentReportClient({
  tenant,
  tracks,
  cohorts,
  learners: allLearners,
  targetsByTrack,
}: {
  tenant: string;
  tracks: TrackResponse[];
  cohorts: CohortResponse[];
  learners: LearnerResponse[];
  targetsByTrack: Record<number, WeeklyTargetResponse[]>;
}) {
  const [cohortId, setCohortId] = useState(cohorts[0]?.id ?? 0);
  const [report, setReport] = useState<ProgressReportResponse | null>(null);
  const [reportQuery, setReportQuery] = useState("");
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [pending, start] = useTransition();
  const loadedCohortRef = useRef<number | null>(null);

  useEffect(() => {
    if (!cohortId || loadedCohortRef.current === cohortId) return;
    loadedCohortRef.current = cohortId;
    setReport(null);
    setReportQuery("");
    setLoadingSaved(true);
    getSavedProgressReport(tenant, cohortId).then(r => {
      if (r.ok) setReport(r.data);
    }).finally(() => setLoadingSaved(false));
  }, [cohortId, tenant]);

  const upload = (file: File) => start(async () => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/gradebook", { method: "POST", body: fd });
    if (!res.ok) { toast.error("Failed to parse gradebook CSV"); return; }
    const { learners: gbRows }: { learners: GradebookRow[]; assignments: string[] } = await res.json();

    // Pre-match each gradebook row to a DB learner: email first, then lowercase name.
    // Substituting the DB learner's fullname as studentName improves backend matching.
    const cohortLearners = allLearners.filter(l => l.cohortId === cohortId);
    const students = gbRows.map(gb => {
      let matchedName = gb.learnerName;

      // 1. Email match (case-insensitive)
      if (gb.email) {
        const byEmail = cohortLearners.find(
          l => l.email.toLowerCase() === gb.email!.toLowerCase().trim(),
        );
        if (byEmail) matchedName = byEmail.fullname;
      }

      // 2. Name match (case-insensitive), only if email didn't match
      if (matchedName === gb.learnerName) {
        const lower = gb.learnerName.toLowerCase().trim();
        const byName = cohortLearners.find(l => l.fullname.toLowerCase().trim() === lower);
        if (byName) matchedName = byName.fullname;
      }

      return {
        studentName: matchedName,
        email: gb.email,
        scores: Object.fromEntries(
          Object.entries(gb.scores).map(([k, v]) => [k, v == null ? "" : String(v)]),
        ),
      };
    });

    const r = await generateProgressReport(tenant, { cohortId, students });
    if (!r.ok) { toast.error(r.error); return; }
    setReport(r.data);
    setReportQuery("");
    toast.success(`Report generated for ${r.data.learners.length} learners`);
  });

  const selectedCohort = cohorts.find(c => c.id === cohortId);
  const trackId = selectedCohort?.trackId ?? null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Canvas gradebook</CardTitle>
          <CardDescription>
            Track assignments are matched by name to weekly targets for the cohort's track.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Cohort</Label>
            <select
              value={cohortId}
              onChange={e => { loadedCohortRef.current = null; setCohortId(Number(e.target.value)); setReport(null); }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {cohorts.map(c => {
                const track = tracks.find(t => t.id === c.trackId);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name}{track ? ` (${track.name})` : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Canvas gradebook CSV</Label>
            <Input
              type="file"
              accept=".csv"
              disabled={pending || cohortId === 0}
              onChange={e => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </div>
        </CardContent>
        {(pending || loadingSaved) && (
          <CardContent>
            <p className="text-sm text-muted-foreground animate-pulse">
              {loadingSaved ? "Loading saved report…" : "Analysing gradebook…"}
            </p>
          </CardContent>
        )}
        {report?.uploadedAt && !pending && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Last uploaded: {new Date(report.uploadedAt).toLocaleString()}
            </p>
          </CardContent>
        )}
      </Card>

      {!report && !pending && trackId && (targetsByTrack[trackId]?.length ?? 0) === 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
          No weekly targets set for the selected cohort&apos;s track. Ask an admin to set them up in Weekly targets first.
        </p>
      )}

      {report && (
        <Input
          placeholder="Search learners…"
          value={reportQuery}
          onChange={e => setReportQuery(e.target.value)}
          className="max-w-xs"
        />
      )}

      {report && report.learners
        .filter(learner =>
          !reportQuery ||
          (learner.learnerDbName ?? learner.gradebookName)
            .toLowerCase()
            .includes(reportQuery.toLowerCase()),
        )
        .map(learner => {
        const totalItems = learner.weeks.reduce((s, w) => s + w.labsTotal + w.kcTotal, 0);
        const doneItems  = learner.weeks.reduce((s, w) => s + w.labsCompleted + w.kcCompleted, 0);
        return (
          <details key={learner.gradebookName} className="rounded-lg border bg-card">
            <summary className="cursor-pointer px-4 py-3 flex items-center justify-between list-none">
              <div>
                <p className="font-medium">{learner.learnerDbName ?? learner.gradebookName}</p>
                {!learner.matched && (
                  <p className="text-xs text-amber-600">Gradebook name: {learner.gradebookName} (unmatched to learner)</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{doneItems}/{totalItems} completed</p>
            </summary>

            <div className="border-t px-4 pb-4 pt-3 space-y-4">
              {learner.weeks.map(week => <WeekSection key={week.weekNumber} week={week} />)}
              {learner.weeks.length === 0 && (
                <p className="text-sm text-muted-foreground">No weekly target data for this cohort&apos;s track.</p>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function WeekSection({ week }: { week: WeekProgress }) {
  const total = week.labsTotal + week.kcTotal;
  const done  = week.labsCompleted + week.kcCompleted;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold">{week.weekNumber.replace("_", " ")}</p>
        <span className="text-xs text-muted-foreground">{done}/{total}</span>
        {done === total && total > 0 && <Badge className="bg-emerald-600 text-white text-xs">Complete</Badge>}
      </div>
      <div className="grid gap-1 sm:grid-cols-2 text-xs">
        {[...week.knowledgeChecks, ...week.labs].map(item => (
          <div key={item.title} className="flex items-center gap-2">
            {item.completed
              ? <Badge variant="default" className="bg-emerald-600 text-[10px] px-1.5 py-0">✓</Badge>
              : item.foundInGradebook
                ? <Badge variant="secondary" className="text-[10px] px-1.5 py-0">…</Badge>
                : <Badge variant="outline" className="text-[10px] px-1.5 py-0">·</Badge>
            }
            <span className={!item.foundInGradebook ? "text-muted-foreground" : ""}>{item.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
