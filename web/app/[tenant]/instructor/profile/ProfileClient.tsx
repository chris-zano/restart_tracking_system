"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { updateProfile, changePassword } from "@/app/actions";
import type { ProfileResponse } from "@/lib/api/profile";

export function ProfileClient({
  tenant,
  profile,
}: {
  tenant: string;
  profile: ProfileResponse;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [email, setEmail] = useState(profile.email ?? "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profilePending, startProfile] = useTransition();
  const [passwordPending, startPassword] = useTransition();

  const submitProfile = () =>
    startProfile(async () => {
      const r = await updateProfile(tenant, { displayName, email });
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Profile updated.");
    });

  const submitPassword = () =>
    startPassword(async () => {
      if (newPassword !== confirmPassword) {
        toast.error("New passwords do not match.");
        return;
      }
      if (newPassword.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return;
      }
      const r = await changePassword(tenant, { currentPassword, newPassword });
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Password changed. Please sign in again with your new password.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    });

  return (
    <div className="space-y-6 max-w-xl">
      {profile.mustChangePassword && (
        <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            You&apos;re using a temporary or expired password.{" "}
            <strong>Please set a new password before continuing.</strong>
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your display name and email address.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={profile.username} disabled className="bg-muted text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={profilePending || !displayName || !email}
            onClick={submitProfile}
          >
            {profilePending ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Use a strong password of at least 8 characters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={passwordPending || !currentPassword || !newPassword || !confirmPassword}
            onClick={submitPassword}
          >
            {passwordPending ? "Changing…" : "Change password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
