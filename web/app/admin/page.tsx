import { tenantsApi } from "@/lib/api/tenants";
import { tracksApi } from "@/lib/api/tracks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function AdminOverview() {
  const [tenants, tracks] = await Promise.all([
    tenantsApi.list().catch(() => []),
    tracksApi.list().catch(() => []),
  ]);
  const active = tenants.filter(t => t.active).length;

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Cross-tenant view of your reStart program.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tenants</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{tenants.length}</p><p className="text-xs text-muted-foreground">{active} active</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tracks</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{tracks.length}</p><p className="text-xs text-muted-foreground"><Link className="underline" href="/admin/tracks">Manage tracks</Link></p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Quick links</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Link className="block underline" href="/admin/tenants">Manage tenants</Link>
            <Link className="block underline" href="/admin/weekly-targets">Edit weekly targets</Link>
            <Link className="block underline" href="/admin/audit-logs">View audit logs</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
