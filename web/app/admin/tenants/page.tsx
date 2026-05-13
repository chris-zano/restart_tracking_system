import { tenantsApi } from "@/lib/api/tenants";
import { TenantsClient } from "./TenantsClient";

export default async function TenantsPage() {
  let tenants: Awaited<ReturnType<typeof tenantsApi.list>> = [];
  try { tenants = await tenantsApi.list(); } catch { /* empty */ }
  return (
    <div className="p-8 space-y-6">
      <header><h1 className="text-2xl font-semibold tracking-tight">Tenants</h1></header>
      <TenantsClient initial={tenants} />
    </div>
  );
}
