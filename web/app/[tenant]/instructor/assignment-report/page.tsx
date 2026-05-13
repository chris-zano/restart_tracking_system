import { instructorWeeklyTargetsApi } from "@/lib/api/weekly-targets";
import { instructorTracksApi } from "@/lib/api/tracks";
import { cohortsApi } from "@/lib/api/cohorts";
import { instructorLearnersApi } from "@/lib/api/learners";
import { AssignmentReportClient } from "./AssignmentReportClient";
import type { WeeklyTargetResponse, TrackResponse, CohortResponse, LearnerResponse } from "@/lib/types";

export default async function AssignmentReportPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  let tracks: TrackResponse[] = [];
  let cohorts: CohortResponse[] = [];
  let learners: LearnerResponse[] = [];
  try { tracks = await instructorTracksApi.list(); } catch { /* offline */ }
  try { cohorts = await cohortsApi.list(); } catch { /* offline */ }
  try { learners = await instructorLearnersApi.list(); } catch { /* offline */ }

  const targetsByTrack: Record<number, WeeklyTargetResponse[]> = {};
  await Promise.all(tracks.map(async (t) => {
    try { targetsByTrack[t.id] = await instructorWeeklyTargetsApi.byTrack(t.id); }
    catch { targetsByTrack[t.id] = []; }
  }));
  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Assignment report</h1>
        <p className="text-muted-foreground">Upload a Canvas gradebook to see per-learner progress grouped by weekly target.</p>
      </header>
      <AssignmentReportClient
        tenant={tenant}
        tracks={tracks}
        cohorts={cohorts}
        learners={learners}
        targetsByTrack={targetsByTrack}
      />
    </div>
  );
}
