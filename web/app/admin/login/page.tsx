"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { adminLogin } from "@/app/actions/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} className="w-full">{pending ? "Signing in…" : "Sign in"}</Button>;
}

export default function AdminLoginPage() {
  const [state, action] = useActionState(adminLogin, null);
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <div className="mb-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold select-none">↻</span>
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Restart</h1>
          <p className="text-sm text-muted-foreground">Admin console</p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Admin sign in</CardTitle>
            <CardDescription>Platform-wide access — tenant management, audit logs, weekly targets.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
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
        <p className="text-center text-sm text-muted-foreground">
          Instructor? <a href="/login" className="underline">Sign in here</a>
        </p>
      </div>
    </main>
  );
}
