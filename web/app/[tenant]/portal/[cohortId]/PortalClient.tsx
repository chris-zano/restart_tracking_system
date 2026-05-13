"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { AttendanceResponse, ProgressReportResponse, WeekProgress } from "@/lib/types";

type PublicLearner = { id: number; fullname: string };

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return new Date(`${y}-${m}-${d}T00:00:00`).toLocaleDateString();
}

// ─── Attendance tab ───────────────────────────────────────────────────────────

function AttendanceView({
  learners,
  attendance,
}: {
  learners: PublicLearner[];
  attendance: AttendanceResponse[];
}) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const sessions = [...attendance].sort(
      (a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime(),
    );
    return learners.map(learner => {
      const rows = sessions.map(session => {
        const p   = session.participants.find(x => x.learnerId === learner.id);
        const dur = p?.duration ?? 0;
        const pct = p && session.duration > 0 ? Math.round((dur / session.duration) * 100) : 0;
        return { session, present: !!p, duration: dur, pct };
      });
      const avgPct   = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0;
      const attended = rows.filter(r => r.present).length;
      return { learner, rows, avgPct, attended, total: sessions.length };
    });
  }, [learners, attendance]);

  if (attendance.length === 0) {
    return <p className="text-sm text-muted-foreground">No attendance sessions recorded yet.</p>;
  }

  const visible = query
    ? grouped.filter(g => g.learner.fullname.toLowerCase().includes(query.toLowerCase()))
    : grouped;

  return (
    <div className="space-y-3">
      <Input
        className="max-w-xs"
        placeholder="Search learners…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="space-y-1">
        {visible.map(({ learner, rows, avgPct, attended, total }) => (
          <details key={learner.id} className="rounded-lg border">
            <summary className="cursor-pointer px-4 py-3 flex items-center justify-between list-none select-none">
              <span className="font-medium">{learner.fullname}</span>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{attended}/{total} sessions</span>
                <span className={`font-semibold tabular-nums ${avgPct >= 75 ? "text-emerald-600" : avgPct >= 50 ? "text-amber-600" : "text-destructive"}`}>
                  {avgPct}% avg
                </span>
              </div>
            </summary>

            <div className="border-t px-4 pb-4 pt-3">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Date</th>
                    <th>Status</th>
                    <th className="text-right pr-4">Duration</th>
                    <th className="text-right">% of class</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.session.id} className="border-t">
                      <td className="py-2">{fmtDate(row.session.sessionDate)}</td>
                      <td>
                        {row.present
                          ? <Badge variant="default" className="bg-emerald-600 text-white text-xs">Present</Badge>
                          : <Badge variant="destructive" className="text-xs">Absent</Badge>}
                      </td>
                      <td className="text-right pr-4 tabular-nums">
                        {row.duration > 0 ? `${row.duration} min` : "—"}
                      </td>
                      <td className="text-right tabular-nums">{row.pct > 0 ? `${row.pct}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm text-muted-foreground text-right">
                Average attendance: <span className="font-semibold text-foreground">{avgPct}%</span>
              </p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

// ─── Progress report tab ──────────────────────────────────────────────────────

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
                : <Badge variant="outline" className="text-[10px] px-1.5 py-0">·</Badge>}
            <span className={!item.foundInGradebook ? "text-muted-foreground" : ""}>{item.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressView({ report }: { report: ProgressReportResponse }) {
  const [query, setQuery] = useState("");

  const visible = query
    ? report.learners.filter(l =>
        (l.learnerDbName ?? l.gradebookName).toLowerCase().includes(query.toLowerCase()),
      )
    : report.learners;

  return (
    <div className="space-y-3">
      {report.uploadedAt && (
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(report.uploadedAt).toLocaleString()}
        </p>
      )}
      <Input
        className="max-w-xs"
        placeholder="Search learners…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="space-y-2">
        {visible.map(learner => {
          const totalItems = learner.weeks.reduce((s, w) => s + w.labsTotal + w.kcTotal, 0);
          const doneItems  = learner.weeks.reduce((s, w) => s + w.labsCompleted + w.kcCompleted, 0);
          return (
            <details key={learner.gradebookName} className="rounded-lg border bg-card">
              <summary className="cursor-pointer px-4 py-3 flex items-center justify-between list-none">
                <div>
                  <p className="font-medium">{learner.learnerDbName ?? learner.gradebookName}</p>
                  {!learner.matched && (
                    <p className="text-xs text-amber-600">Gradebook name: {learner.gradebookName}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{doneItems}/{totalItems} completed</p>
              </summary>
              <div className="border-t px-4 pb-4 pt-3 space-y-4">
                {learner.weeks.map(week => <WeekSection key={week.weekNumber} week={week} />)}
                {learner.weeks.length === 0 && (
                  <p className="text-sm text-muted-foreground">No weekly target data available.</p>
                )}
              </div>
            </details>
          );
        })}
        {visible.length === 0 && (
          <p className="text-sm text-muted-foreground">No matching learners.</p>
        )}
      </div>
    </div>
  );
}

// ─── Root client component ────────────────────────────────────────────────────

export function PortalClient({
  learners,
  attendance,
  progressReport,
}: {
  cohortName: string;
  learners: PublicLearner[];
  attendance: AttendanceResponse[];
  progressReport: ProgressReportResponse | null;
}) {
  const [tab, setTab] = useState<"attendance" | "progress">("attendance");

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex rounded-md border w-fit overflow-hidden">
        <button
          className={`px-4 py-2 text-sm transition-colors ${tab === "attendance" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
          onClick={() => setTab("attendance")}
        >
          Attendance
        </button>
        <button
          className={`px-4 py-2 text-sm border-l transition-colors ${tab === "progress" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
          onClick={() => setTab("progress")}
        >
          Assignment report
        </button>
      </div>

      {tab === "attendance" && (
        <AttendanceView learners={learners} attendance={attendance} />
      )}

      {tab === "progress" && (
        progressReport
          ? <ProgressView report={progressReport} />
          : <p className="text-sm text-muted-foreground">No assignment report has been uploaded yet.</p>
      )}
    </div>
  );
}
