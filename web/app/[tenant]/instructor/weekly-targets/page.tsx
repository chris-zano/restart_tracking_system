import { weeklyTargetsApi } from "@/lib/api/weekly-targets";
import { TRACKS } from "@/lib/tracks-temp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WEEK_NUMBERS } from "@/lib/types";

export default async function InstructorWeeklyTargetsPage({ searchParams }: { searchParams: Promise<{ trackId?: string }> }) {
  const sp = await searchParams;
  const trackId = Number(sp.trackId ?? TRACKS[0].id);
  const targets = await weeklyTargetsApi.byTrack(trackId).catch(() => []);
  const byWeek = Object.fromEntries(targets.map(t => [t.weekNumber, t]));

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Weekly targets</h1>
        <p className="text-muted-foreground">Read-only view of the KCs and Labs your learners should complete each week.</p>
      </header>
      <div className="flex gap-2 flex-wrap">
        {TRACKS.map(t => (
          <a key={t.id} href={`?trackId=${t.id}`} className={`px-3 py-1.5 text-sm rounded-md border ${trackId === t.id ? "bg-primary text-primary-foreground" : ""}`}>{t.short}</a>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {WEEK_NUMBERS.map(w => {
          const t = byWeek[w];
          return (
            <Card key={w}>
              <CardHeader><CardTitle className="text-base">{w.replace("_", " ")}</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-3">
                <div>
                  <p className="font-medium mb-1">Knowledge checks ({t?.knowledgeChecks.length ?? 0})</p>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    {(t?.knowledgeChecks ?? []).map(k => <li key={k}>{k}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">Labs ({t?.labs.length ?? 0})</p>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    {(t?.labs ?? []).map(l => <li key={l}>{l}</li>)}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
