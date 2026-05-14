import { instructorWeeklyTargetsApi } from "@/lib/api/weekly-targets";
import { TRACKS } from "@/lib/tracks-temp";
import { WeeklyTargetsAccordion } from "./WeeklyTargetsAccordion";

export default async function InstructorWeeklyTargetsPage({ searchParams }: { searchParams: Promise<{ trackId?: string }> }) {
  const sp = await searchParams;
  const trackId = Number(sp.trackId ?? TRACKS[0].id);
  const targets = await instructorWeeklyTargetsApi.byTrack(trackId).catch(() => []);

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Weekly targets</h1>
        <p className="text-muted-foreground">Read-only view of the KCs and Labs your learners should complete each week.</p>
      </header>
      <div className="flex gap-2 flex-wrap">
        {TRACKS.map(t => (
          <a
            key={t.id}
            href={`?trackId=${t.id}`}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${trackId === t.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
          >
            {t.short}
          </a>
        ))}
      </div>
      <WeeklyTargetsAccordion targets={targets} />
    </div>
  );
}
