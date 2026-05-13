import { tenantsApi } from "@/lib/api/tenants";
import { adminAttendanceApi } from "@/lib/api/attendance";
import Link from "next/link";

export default async function AdminAttendancePage({ searchParams }: { searchParams: Promise<{ tenant?: string }> }) {
  const sp = await searchParams;
  const tenants = await tenantsApi.list().catch(() => []);
  const active = sp.tenant ?? tenants[0]?.schemaName;
  const records = active ? await adminAttendanceApi.list(active).catch(() => []) : [];

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance (read-only)</h1>
        <p className="text-muted-foreground">Cross-tenant view; instructors record sessions in their own console.</p>
      </header>
      <div className="flex gap-2 flex-wrap">
        {tenants.map(t => (
          <Link key={t.schemaName} href={`/admin/attendance?tenant=${t.schemaName}`}
                className={`px-3 py-1.5 text-sm rounded-md border ${active === t.schemaName ? "bg-primary text-primary-foreground" : "bg-background"}`}>
            {t.instructorName}
          </Link>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr className="border-b"><th className="py-2">Date</th><th>Cohort</th><th>Duration</th><th>Participants</th></tr>
        </thead>
        <tbody>
          {records.map(r => (
            <tr key={r.id} className="border-b">
              <td className="py-2">{r.sessionDate}</td>
              <td>#{r.cohortId}</td>
              <td>{r.duration} min</td>
              <td>{r.participants.length}</td>
            </tr>
          ))}
          {records.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No attendance records.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
