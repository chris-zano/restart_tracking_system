import "server-only";
import { api } from "./_client";
import type { LoginResponse } from "../types";

export const authApi = {
  adminLogin: (body: { username: string; password: string }) =>
    api<LoginResponse>("/api/auth/admin/login", { method: "POST", body }),

  /** Instructor login — requires X-Tenant-ID; tenantId is the schema name. */
  instructorLogin: (tenantId: string, body: { username: string; password: string }) =>
    api<LoginResponse>("/api/auth/login", { method: "POST", body, tenantId }),
};
