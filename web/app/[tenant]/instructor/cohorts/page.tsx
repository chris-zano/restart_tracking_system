import { cohortsApi } from "@/lib/api/cohorts";
import { instructorTracksApi } from "@/lib/api/tracks";
import { CohortsClient } from "./CohortsClient";

export default async function CohortsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const [cohorts, tracks] = await Promise.all([
    cohortsApi.list().catch(() => []),
    instructorTracksApi.list().catch(() => []),
  ]);
  return (
    <div className="p-8 space-y-6">
      <header><h1 className="text-2xl font-semibold tracking-tight">Cohorts</h1></header>
      <CohortsClient tenant={tenant} initial={cohorts} tracks={tracks} />
    </div>
  );
}


