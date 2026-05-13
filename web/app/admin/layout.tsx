import { logout } from "@/app/actions/auth";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/AdminNav";
import { LogOut } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // Login page is inside /admin/ but has no session yet — render without sidebar.
  // Middleware guarantees all other /admin/** routes have a valid admin session.
  if (!session || session.role !== "ADMIN") {
    return <>{children}</>;
  }

  return (
    <div className="grid h-screen grid-cols-[260px_1fr] overflow-hidden">
      <aside className="border-r bg-muted/30 flex flex-col h-full overflow-y-auto">
        <div className="px-5 py-5 border-b">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold select-none">↻</span>
            <span className="font-serif text-sm font-semibold tracking-tight">Restart</span>
          </div>
          <p className="text-sm font-medium">Admin Console</p>
        </div>
        <AdminNav />
        <div className="border-t p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{session.sub}</span>
          </p>
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
