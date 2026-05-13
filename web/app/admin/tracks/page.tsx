import { tracksApi } from "@/lib/api/tracks";
import { TracksClient } from "./TracksClient";

export default async function TracksPage() {
  let tracks: Awaited<ReturnType<typeof tracksApi.list>> = [];
  try { tracks = await tracksApi.list(); } catch { /* empty */ }

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Tracks</h1>
        <p className="text-muted-foreground">Manage AWS reStart cohort tracks.</p>
      </header>
      <TracksClient initial={tracks} />
    </div>
  );
}
