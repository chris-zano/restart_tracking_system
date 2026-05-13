"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createTenant } from "@/app/actions";
import type { TenantResponse } from "@/lib/types";
import Link from "next/link";

export function TenantsClient({ initial }: { initial: TenantResponse[] }) {
  const [tenants, setTenants] = useState(initial);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();

  const q = query.toLowerCase();
  const visible = q
    ? tenants.filter(t =>
        t.schemaName.toLowerCase().includes(q) ||
        t.instructorName.toLowerCase().includes(q),
      )
    : tenants;

  const submit = () => start(async () => {
    if (!name.trim()) return;
    const r = await createTenant(name.trim());
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`Tenant ${r.data.schemaName} created`);
    setTenants([r.data, ...tenants]);
    setName("");
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>All tenants</CardTitle>
          <CardDescription>Each tenant is one instructor with an isolated schema.</CardDescription>
          <Input
            className="mt-2 max-w-xs"
            placeholder="Search by schema or instructor…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-2">Schema</th><th>Instructor</th><th>Status</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                {visible.map(t => (
                  <tr key={t.id} className="border-t">
                    <td className="py-2 font-mono text-xs">{t.schemaName}</td>
                    <td>{t.instructorName}</td>
                    <td>{t.active ? <span className="text-emerald-600">Active</span> : <span className="text-muted-foreground">Inactive</span>}</td>
                    <td className="text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="text-right"><Link className="underline" href={`/admin/tenants/${t.schemaName}`}>Open</Link></td>
                  </tr>
                ))}
                {visible.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">{query ? "No matching tenants." : "No tenants yet."}</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Create tenant</CardTitle><CardDescription>Provisions a new schema.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instructorName">Instructor name</Label>
            <Input id="instructorName" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Christian Owusu" />
          </div>
          <Button onClick={submit} disabled={pending || !name.trim()} className="w-full">
            {pending ? "Creating…" : "Create tenant"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
