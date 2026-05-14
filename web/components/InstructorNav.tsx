"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Layers, CalendarPlus, ListChecks, FileBarChart, UserCircle } from "lucide-react";

const NAV = [
  { segment: "",                  label: "Home",              Icon: LayoutDashboard, exact: true },
  { segment: "/cohorts",          label: "Cohorts",           Icon: Layers },
  { segment: "/learners",         label: "Learners",          Icon: Users },
  { segment: "/attendance",       label: "Take attendance",   Icon: CalendarPlus },
  { segment: "/weekly-targets",   label: "Weekly targets",    Icon: ListChecks },
  { segment: "/assignment-report", label: "Assignment report", Icon: FileBarChart },
  { segment: "/profile",          label: "Profile",           Icon: UserCircle },
];

export function InstructorNav({ tenant }: { tenant: string }) {
  const pathname = usePathname();
  const base = `/${tenant}/instructor`;

  return (
    <nav className="flex-1 p-3 space-y-1">
      {NAV.map(({ segment, label, Icon, exact }) => {
        const href = `${base}${segment}`;
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
