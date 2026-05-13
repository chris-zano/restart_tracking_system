import { tenantsApi } from "@/lib/api/tenants";
import { adminInstructorsApi } from "@/lib/api/admin-instructors";
import { adminLearnersApi } from "@/lib/api/learners";
import { ProvisionInstructorClient } from "./ProvisionInstructorClient";
import { AdminLearnersClient } from "./AdminLearnersClient";
import { notFound } from "next/navigation";

export default async function TenantDetailPage({ params }: { params: Promise<{ schemaName: string }> }) {
  const { schemaName } = await params;
  let tenant, instructors: Awaited<ReturnType<typeof adminInstructorsApi.list>> = [], learners: Awaited<ReturnType<typeof adminLearnersApi.list>> = [];
  try { tenant = await tenantsApi.get(schemaName); } catch { notFound(); }
  try { instructors = await adminInstructorsApi.list(schemaName); } catch { /* empty */ }
  try { learners = await adminLearnersApi.list(schemaName); } catch { /* empty */ }

  return (
    <div className="p-8 space-y-6">
      <header>
        <p className="text-xs font-mono text-muted-foreground">{tenant!.schemaName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{tenant!.instructorName}</h1>
        <p className="text-sm text-muted-foreground">Created {new Date(tenant!.createdAt).toLocaleString()}</p>
      </header>
      <ProvisionInstructorClient schemaName={schemaName} initial={instructors} />
      <AdminLearnersClient schemaName={schemaName} initial={learners} />
    </div>
  );
}
