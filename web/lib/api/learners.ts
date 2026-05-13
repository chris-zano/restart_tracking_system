import "server-only";
import { api } from "./_client";
import type { LearnerRequest, LearnerResponse } from "../types";

/** ADMIN-side learner CRUD — operates on any tenant via path. */
export const adminLearnersApi = {
  list:       (schemaName: string) => api<LearnerResponse[]>(`/api/admin/tenants/${schemaName}/learners`),
  get:        (schemaName: string, id: number) => api<LearnerResponse>(`/api/admin/tenants/${schemaName}/learners/${id}`),
  create:     (schemaName: string, body: LearnerRequest) =>
                api<LearnerResponse>(`/api/admin/tenants/${schemaName}/learners`, { method: "POST", body }),
  bulkCreate: (schemaName: string, body: LearnerRequest[]) =>
                api<LearnerResponse[]>(`/api/admin/tenants/${schemaName}/learners/bulk`, { method: "POST", body }),
  update:     (schemaName: string, id: number, body: LearnerRequest) =>
                api<LearnerResponse>(`/api/admin/tenants/${schemaName}/learners/${id}`, { method: "PUT", body }),
  remove:     (schemaName: string, id: number) =>
                api<void>(`/api/admin/tenants/${schemaName}/learners/${id}`, { method: "DELETE" }),
};

/** INSTRUCTOR-side learner CRUD — tenant derived from JWT. */
export const instructorLearnersApi = {
  list:       () => api<LearnerResponse[]>(`/api/instructor/learners`),
  get:        (id: number) => api<LearnerResponse>(`/api/instructor/learners/${id}`),
  create:     (body: LearnerRequest) =>
                api<LearnerResponse>(`/api/instructor/learners`, { method: "POST", body }),
  bulkCreate: (body: LearnerRequest[]) =>
                api<LearnerResponse[]>(`/api/instructor/learners/bulk`, { method: "POST", body }),
  update:     (id: number, body: LearnerRequest) =>
                api<LearnerResponse>(`/api/instructor/learners/${id}`, { method: "PUT", body }),
  remove:     (id: number) =>
                api<void>(`/api/instructor/learners/${id}`, { method: "DELETE" }),
};
