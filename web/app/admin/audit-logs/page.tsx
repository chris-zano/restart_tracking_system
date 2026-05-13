import { auditLogsApi } from "@/lib/api/audit-logs";
import { Card, CardContent } from "@/components/ui/card";

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<{ page?: string; tenantId?: string; action?: string }> }) {
  const sp = await searchParams;
  const page = Number(sp.page ?? 0);
  let res;
  try { res = await auditLogsApi.query({ page, size: 25, tenantId: sp.tenantId, action: sp.action }); }
  catch { res = { content: [], totalPages: 0, totalElements: 0, size: 25, number: 0 }; }

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Audit logs</h1>
        <p className="text-muted-foreground">{res.totalElements.toLocaleString()} events</p>
      </header>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 px-4">When</th><th>Actor</th><th>Tenant</th>
                <th>Action</th><th>Resource</th><th>Endpoint</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {res.content.map(l => (
                <tr key={l.id} className="border-b">
                  <td className="py-2 px-4 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                  <td>{l.actorUsername}</td>
                  <td className="font-mono text-xs">{l.tenantId ?? "—"}</td>
                  <td>{l.action ?? "—"}</td>
                  <td>{l.resourceType ?? "—"}{l.resourceId ? ` #${l.resourceId}` : ""}</td>
                  <td className="font-mono text-xs">{l.httpMethod} {l.endpointPath}</td>
                  <td className={l.httpStatus >= 400 ? "text-destructive" : ""}>{l.httpStatus}</td>
                </tr>
              ))}
              {res.content.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No events.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
