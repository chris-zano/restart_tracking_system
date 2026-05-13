"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import { instructorLogin } from "@/app/actions/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { TenantResponse } from "@/lib/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} className="w-full">{pending ? "Signing in…" : "Sign in"}</Button>;
}

export function InstructorLoginForm({ tenants, defaultTenant }: { tenants: TenantResponse[]; defaultTenant?: string }) {
  const [state, action] = useActionState(instructorLogin, null);
  const [tenantId, setTenantId] = useState(defaultTenant ?? "");

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Instructor sign in</CardTitle>
        <CardDescription>Pick your tenant, then enter your credentials.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenantId">Tenant</Label>
            <select
              id="tenantId"
              name="tenantId"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select tenant…</option>
              {tenants.map((t) => (
                <option key={t.schemaName} value={t.schemaName}>
                  {t.instructorName} · {t.schemaName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" required autoComplete="username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {state && !state.ok && (
            <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
          )}
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
