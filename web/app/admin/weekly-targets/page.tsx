import { weeklyTargetsApi } from "@/lib/api/weekly-targets";
import { tracksApi } from "@/lib/api/tracks";
import { WeeklyTargetsClient } from "./WeeklyTargetsClient";
import type { WeeklyTargetResponse, TrackResponse } from "@/lib/types";

export default async function WeeklyTargetsPage() {
  let tracks: TrackResponse[] = [];
  try { tracks = await tracksApi.list(); } catch { /* empty */ }

  const initial: Record<number, WeeklyTargetResponse[]> = {};
  await Promise.all(tracks.map(async (t) => {
    try { initial[t.id] = await weeklyTargetsApi.byTrack(t.id); }
    catch { initial[t.id] = []; }
  }));

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Weekly targets</h1>
        <p className="text-muted-foreground">10-week breakdown of KCs and Labs per track.</p>
      </header>
      <WeeklyTargetsClient tracks={tracks} initial={initial} />
    </div>
  );
}
