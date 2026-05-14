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
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();

  const submit = () => start(async () => {
    const r = await provisionInstructor({ schemaName, username, displayName, email });
    if (!r.ok) { toast.error(r.error); return; }

    const instructor = r.data;
    setList([instructor, ...list]);
    setUsername(""); setDisplayName(""); setEmail("");

    // Send invite email if temp password was returned
    if (instructor.tempPassword && instructor.email) {
      const origin = window.location.origin;
      const loginUrl = `${origin}/login?tenant=${schemaName}`;
      const res = await fetch("/api/email/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: instructor.displayName ?? instructor.username,
          recipientEmail: instructor.email,
          username: instructor.username,
          tempPassword: instructor.tempPassword,
          loginUrl,
        }),
      });
      if (!res.ok) {
        toast.warning(`Instructor provisioned but invite email failed to send.`);
      } else {
        toast.success(`Instructor ${instructor.username} provisioned and invite sent to ${instructor.email}.`);
      }
    } else {
      toast.success(`Instructor ${instructor.username} provisioned.`);
    }
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
                  <div>
                    <p className="font-medium">{i.displayName ?? i.username}</p>
                    <p className="text-xs text-muted-foreground">{i.username}{i.email ? ` · ${i.email}` : ""}</p>
                  </div>
                  <span className={i.active ? "text-emerald-600 text-xs" : "text-muted-foreground text-xs"}>
                    {i.active ? "Active" : "Inactive"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Provision instructor</CardTitle>
          <CardDescription>
            A temporary password will be generated and an invite email sent automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Full name</Label>
            <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <Button
            className="w-full"
            disabled={pending || !username || !displayName || !email}
            onClick={submit}
          >
            {pending ? "Provisioning…" : "Provision & send invite"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
