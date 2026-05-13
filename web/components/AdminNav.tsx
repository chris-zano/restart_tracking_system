"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, ListChecks, ScrollText, CalendarCheck, Route } from "lucide-react";

const NAV = [
  { href: "/admin",                label: "Overview",       Icon: LayoutDashboard, exact: true },
  { href: "/admin/tenants",        label: "Tenants",        Icon: Building2 },
  { href: "/admin/tracks",         label: "Tracks",         Icon: Route },
  { href: "/admin/weekly-targets", label: "Weekly targets", Icon: ListChecks },
  { href: "/admin/attendance",     label: "Attendance",     Icon: CalendarCheck },
  { href: "/admin/audit-logs",     label: "Audit logs",     Icon: ScrollText },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-3 space-y-1">
      {NAV.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-primary text-primary-foreground font-medium"
                : "hover:bg-accent text-foreground/80"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
