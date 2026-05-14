import { cohortsApi } from "@/lib/api/cohorts";
import { instructorLearnersApi } from "@/lib/api/learners";
import { instructorAttendanceApi } from "@/lib/api/attendance";
import { progressApi } from "@/lib/api/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRACKS, trackById } from "@/lib/tracks-temp";
import Link from "next/link";
import { Users, GraduationCap, Video } from "lucide-react";
import {
  AttendanceTrendChart,
  WeeklyCompletionChart,
  type AttendanceTrendPoint,
  type WeeklyCompletionPoint,
} from "@/components/dashboard/DashboardCharts";
import { format, parseISO } from "date-fns";

export default async function InstructorHome({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const [cohorts, learners, attendance] = await Promise.all([
    cohortsApi.list().catch(() => []),
    instructorLearnersApi.list().catch(() => []),
    instructorAttendanceApi.list().catch(() => []),
  ]);

  const progressReports = await Promise.all(
    cohorts.map((c) => progressApi.getSaved(c.id).catch(() => null))
  );

  // ── Attendance trend ──────────────────────────────────────────────────────
  const attendanceTrend: AttendanceTrendPoint[] = attendance
    .slice()
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))
    .map((session, idx) => {
      const cohortLearners = learners.filter((l) => l.cohortId === session.cohortId);
      const total = cohortLearners.length;
      const present = session.participants.length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      const cohort = cohorts.find((c) => c.id === session.cohortId);
      return {
        label: format(parseISO(session.sessionDate), "MMM d"),
        rate,
        cohortName: cohort?.name ?? `Session ${idx + 1}`,
      };
    });

  // ── Weekly completion trend ───────────────────────────────────────────────
  const weekAgg: Record<string, { labsDone: number; labsTotal: number; kcDone: number; kcTotal: number }> = {};

  for (const report of progressReports) {
    if (!report) continue;
    for (const learner of report.learners) {
      if (!learner.matched) continue;
      for (const week of learner.weeks) {
        const k = week.weekNumber;
        if (!weekAgg[k]) weekAgg[k] = { labsDone: 0, labsTotal: 0, kcDone: 0, kcTotal: 0 };
        weekAgg[k].labsDone += week.labsCompleted;
        weekAgg[k].labsTotal += week.labsTotal;
        weekAgg[k].kcDone += week.kcCompleted;
        weekAgg[k].kcTotal += week.kcTotal;
      }
    }
  }

  const weeklyCompletion: WeeklyCompletionPoint[] = Object.entries(weekAgg)
    .filter(([key]) => key !== "WEEK_10")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => {
      const labRate = v.labsTotal > 0 ? Math.round((v.labsDone / v.labsTotal) * 100) : 0;
      const kcRate = v.kcTotal > 0 ? Math.round((v.kcDone / v.kcTotal) * 100) : 0;
      const total = v.labsTotal + v.kcTotal;
      const done = v.labsDone + v.kcDone;
      const rate = total > 0 ? Math.round((done / total) * 100) : 0;
      return { week: key.replace("WEEK_", "Wk "), rate, labRate, kcRate };
    });

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">Quick view of your cohorts and recent activity.</p>
      </header>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cohorts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{cohorts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Learners</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{learners.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sessions recorded</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{attendance.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance trend</CardTitle>
            <p className="text-xs text-muted-foreground">% of enrolled learners present per session</p>
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart data={attendanceTrend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly target completion</CardTitle>
            <p className="text-xs text-muted-foreground">% of assigned items completed per week</p>
          </CardHeader>
          <CardContent>
            <WeeklyCompletionChart data={weeklyCompletion} />
          </CardContent>
        </Card>
      </div>

      {/* ── Cohorts + Tracks ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Your cohorts</CardTitle></CardHeader>
          <CardContent>
            {cohorts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No cohorts yet.{" "}
                <Link className="underline" href={`/${tenant}/instructor/cohorts`}>Create one</Link>.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {cohorts.map((c) => {
                  const tk = c.trackId ? trackById(c.trackId) : null;
                  return (
                    <li key={c.id} className="py-2 flex items-center justify-between">
                      <Link href={`/${tenant}/instructor/cohorts/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">{tk?.short ?? "—"}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tracks</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {TRACKS.map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                  <span>{t.short}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
