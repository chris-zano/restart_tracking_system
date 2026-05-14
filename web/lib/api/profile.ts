import "server-only";
import { api } from "./_client";

export type ProfileResponse = {
  username: string;
  displayName: string | null;
  email: string | null;
  mustChangePassword: boolean;
};

export type UpdateProfileRequest = {
  displayName: string;
  email: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export const profileApi = {
  get:            () => api<ProfileResponse>("/api/instructor/profile"),
  update:         (body: UpdateProfileRequest) =>
                    api<ProfileResponse>("/api/instructor/profile", { method: "PUT", body }),
  changePassword: (body: ChangePasswordRequest) =>
                    api<void>("/api/instructor/profile/password", { method: "PUT", body }),
};
