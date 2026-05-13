import { cohortsApi } from "@/lib/api/cohorts";
import { instructorLearnersApi } from "@/lib/api/learners";
import { AttendanceClient } from "./AttendanceClient";

export default async function AttendancePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const [cohorts, learners] = await Promise.all([
    cohortsApi.list().catch(() => []),
    instructorLearnersApi.list().catch(() => []),
  ]);
  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Take attendance</h1>
        <p className="text-muted-foreground">Upload Zoom participants CSV → match → record.</p>
      </header>
      <AttendanceClient tenant={tenant} cohorts={cohorts} learners={learners} />
    </div>
  );
}
