import { instructorLearnersApi } from "@/lib/api/learners";
import { cohortsApi } from "@/lib/api/cohorts";
import { LearnersClient } from "./LearnersClient";

export default async function LearnersPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const [learners, cohorts] = await Promise.all([
    instructorLearnersApi.list().catch(() => []),
    cohortsApi.list().catch(() => []),
  ]);
  return (
    <div className="p-8 space-y-6">
      <header><h1 className="text-2xl font-semibold tracking-tight">Learners</h1></header>
      <LearnersClient tenant={tenant} initial={learners} cohorts={cohorts} />
    </div>
  );
}
