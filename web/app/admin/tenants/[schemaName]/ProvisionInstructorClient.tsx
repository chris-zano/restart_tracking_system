"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { provisionInstructor } from "@/app/actions";
import type { InstructorResponse } from "@/lib/types";

export function ProvisionInstructorClient({ schemaName, initial }: { schemaName: string; initial: InstructorResponse[] }) {
  const [list, setList] = useState(initial);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();

  const submit = () => start(async () => {
    const r = await provisionInstructor({ schemaName, username, password });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`Instructor ${r.data.username} provisioned`);
    setList([r.data, ...list]);
    setUsername(""); setPassword("");
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader><CardTitle>Instructors</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">No instructors yet for this tenant.</p>
          ) : (
            <ul className="divide-y text-sm">
              {list.map(i => (
                <li key={i.id} className="py-2 flex items-center justify-between">
                  <span className="font-medium">{i.username}</span>
                  <span className={i.active ? "text-emerald-600 text-xs" : "text-muted-foreground text-xs"}>{i.active ? "Active" : "Inactive"}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Provision instructor</CardTitle><CardDescription>Creates a login for this tenant.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Initial password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button className="w-full" disabled={pending || !username || !password} onClick={submit}>
            {pending ? "Provisioning…" : "Provision"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
