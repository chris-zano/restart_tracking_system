/**
 * Public instructor login. Lists tenants from /api/tenants (public endpoint
 * per spec) so the dropdown shows real schema names. Falls back to an empty
 * list if the API is unreachable.
 */
import { tenantsApi } from "@/lib/api/tenants";
import { InstructorLoginForm } from "./InstructorLoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ tenant?: string }> }) {
  const { tenant } = await searchParams;
  let tenants: Awaited<ReturnType<typeof tenantsApi.listActive>> = [];
  try { tenants = await tenantsApi.listActive(); } catch { /* surface empty list */ }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold select-none">↻</span>
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Restart</h1>
          <p className="text-sm text-muted-foreground">AWS reStart cohort management</p>
        </header>
        <InstructorLoginForm tenants={tenants} defaultTenant={tenant} />
        <p className="text-center text-sm text-muted-foreground">
          Admin? <a href="/admin/login" className="underline">Sign in here</a>
        </p>
      </div>
    </main>
  );
}
