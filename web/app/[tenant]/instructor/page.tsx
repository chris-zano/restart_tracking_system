import { cohortsApi } from "@/lib/api/cohorts";
import { instructorLearnersApi } from "@/lib/api/learners";
import { instructorAttendanceApi } from "@/lib/api/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRACKS, trackById } from "@/lib/tracks-temp";
import Link from "next/link";

export default async function InstructorHome({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const [cohorts, learners, attendance] = await Promise.all([
    cohortsApi.list().catch(() => []),
    instructorLearnersApi.list().catch(() => []),
    instructorAttendanceApi.list().catch(() => []),
  ]);

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">Quick view of your cohorts and recent activity.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cohorts</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{cohorts.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Learners</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{learners.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Sessions recorded</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{attendance.length}</p></CardContent></Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Your cohorts</CardTitle></CardHeader>
          <CardContent>
            {cohorts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cohorts yet. <Link className="underline" href={`/${tenant}/instructor/cohorts`}>Create one</Link>.</p>
            ) : (
              <ul className="divide-y text-sm">
                {cohorts.map(c => {
                  const tk = c.trackId ? trackById(c.trackId) : null;
                  return (
                    <li key={c.id} className="py-2 flex items-center justify-between">
                      <Link href={`/${tenant}/instructor/cohorts/${c.id}`} className="hover:underline">{c.name}</Link>
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
              {TRACKS.map(t => (
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
