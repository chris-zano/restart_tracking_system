import { cohortsApi } from "@/lib/api/cohorts";
import { instructorLearnersApi } from "@/lib/api/learners";
import { instructorAttendanceApi } from "@/lib/api/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackById } from "@/lib/tracks-temp";
import { notFound } from "next/navigation";

export default async function CohortDetail({ params }: { params: Promise<{ tenant: string; id: string }> }) {
  const { tenant, id } = await params;
  const cohortId = Number(id);
  let cohort;
  try { cohort = await cohortsApi.get(cohortId); } catch { notFound(); }
  const [learners, attendance] = await Promise.all([
    instructorLearnersApi.list().catch(() => []),
    instructorAttendanceApi.byCohort(cohortId).catch(() => []),
  ]);
  const cohortLearners = learners.filter(l => l.cohortId === cohortId);
  const track = cohort!.trackId ? trackById(cohort!.trackId) : null;

  return (
    <div className="p-8 space-y-6">
      <header>
        <p className="text-xs text-muted-foreground">{track?.name ?? "No track"}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{cohort!.name}</h1>
        {cohort!.description && <p className="text-muted-foreground">{cohort!.description}</p>}
      </header>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Learners ({cohortLearners.length})</CardTitle></CardHeader>
          <CardContent>
            {cohortLearners.length === 0 ? <p className="text-sm text-muted-foreground">No learners assigned.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr><th className="py-2">Name</th><th>Email</th><th>Phone</th></tr>
                  </thead>
                  <tbody>
                    {cohortLearners.map(l => (
                      <tr key={l.id} className="border-t">
                        <td className="py-2 font-medium">{l.fullname}</td>
                        <td>{l.email}</td>
                        <td className="font-mono text-xs">{l.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent sessions ({attendance.length})</CardTitle></CardHeader>
          <CardContent>
            {attendance.length === 0 ? <p className="text-sm text-muted-foreground">No sessions yet. <a className="underline" href={`/${tenant}/instructor/attendance`}>Record one</a>.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr><th className="py-2">Date</th><th>Participants</th><th>Duration</th></tr>
                  </thead>
                  <tbody>
                    {attendance.slice(0, 10).map(a => (
                      <tr key={a.id} className="border-t">
                        <td className="py-2">{a.sessionDate}</td>
                        <td>{a.participants.length}</td>
                        <td>{a.duration}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
