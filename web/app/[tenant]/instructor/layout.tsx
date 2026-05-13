import { logout } from "@/app/actions/auth";
import { requireInstructor } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { InstructorNav } from "@/components/InstructorNav";
import { LogOut } from "lucide-react";

export default async function InstructorLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const session = await requireInstructor(tenant);

  return (
    <div className="grid h-screen grid-cols-[260px_1fr] overflow-hidden">
      <aside className="border-r bg-muted/30 flex flex-col h-full overflow-y-auto">
        <div className="px-5 py-5 border-b">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold select-none">↻</span>
            <span className="font-serif text-sm font-semibold tracking-tight">Restart</span>
          </div>
          <p className="text-sm font-medium">{session.sub}</p>
          <p className="text-xs text-muted-foreground font-mono">{tenant}</p>
        </div>
        <InstructorNav tenant={tenant} />
        <div className="border-t p-4">
          <form action={logout}>
            <Button variant="outline" size="sm" className="w-full">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </form>
        </div>
      </aside>
      <main className="overflow-y-auto">{children}</main>
    </div>
  );
}
