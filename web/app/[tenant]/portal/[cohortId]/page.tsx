import { PortalClient } from "./PortalClient";
import type { AttendanceResponse, ProgressReportResponse } from "@/lib/types";

type PublicLearner = { id: number; fullname: string };

type DashboardData = {
  cohortName: string;
  learners: PublicLearner[];
  attendance: AttendanceResponse[];
  progressReport: ProgressReportResponse | null;
};

const BASE = process.env.RESTART_API_BASE_URL ?? "http://localhost:8080";

async function fetchDashboard(schema: string, cohortId: string): Promise<DashboardData | null> {
  try {
    const res = await fetch(
      `${BASE}/api/public/${schema}/cohorts/${cohortId}/dashboard`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as DashboardData;
  } catch {
    return null;
  }
}

export default async function PortalPage({
  params,
}: {
  params: Promise<{ tenant: string; cohortId: string }>;
}) {
  const { tenant, cohortId } = await params;
  const data = await fetchDashboard(tenant, cohortId);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cohort not found or no data available yet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">{data.cohortName}</h1>
          <p className="text-muted-foreground text-sm mt-1">Your progress dashboard</p>
        </header>
        <PortalClient
          cohortName={data.cohortName}
          learners={data.learners}
          attendance={data.attendance}
          progressReport={data.progressReport}
        />
      </div>
    </div>
  );
}
