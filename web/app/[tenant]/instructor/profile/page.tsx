import { profileApi } from "@/lib/api/profile";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const profile = await profileApi.get().catch(() => null);

  if (!profile) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Could not load profile. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account details and password.</p>
      </header>
      <ProfileClient tenant={tenant} profile={profile} />
    </div>
  );
}
