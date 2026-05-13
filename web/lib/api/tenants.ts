import "server-only";
import { api } from "./_client";
import type { TenantRequest, TenantResponse } from "../types";

export const tenantsApi = {
  list:        () => api<TenantResponse[]>("/api/tenants"),
  listActive:  () => api<TenantResponse[]>("/api/public/tenants"),
  get:         (schemaName: string) => api<TenantResponse>(`/api/tenants/${schemaName}`),
  create:      (body: TenantRequest) => api<TenantResponse>("/api/tenants", { method: "POST", body }),
};
