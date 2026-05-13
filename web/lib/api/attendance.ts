import "server-only";
import { api } from "./_client";
import type { AttendanceRequest, AttendanceResponse } from "../types";

export const instructorAttendanceApi = {
  list:        () => api<AttendanceResponse[]>("/api/instructor/attendance"),
  byCohort:    (cohortId: number) => api<AttendanceResponse[]>(`/api/instructor/attendance/cohort/${cohortId}`),
  get:         (id: number) => api<AttendanceResponse>(`/api/instructor/attendance/${id}`),
  create:      (body: AttendanceRequest) => api<AttendanceResponse>("/api/instructor/attendance", { method: "POST", body }),
  update:      (id: number, body: AttendanceRequest) => api<AttendanceResponse>(`/api/instructor/attendance/${id}`, { method: "PUT", body }),
  remove:      (id: number) => api<void>(`/api/instructor/attendance/${id}`, { method: "DELETE" }),
};

export const adminAttendanceApi = {
  list:     (schemaName: string) => api<AttendanceResponse[]>(`/api/admin/tenants/${schemaName}/attendance`),
  byCohort: (schemaName: string, cohortId: number) =>
              api<AttendanceResponse[]>(`/api/admin/tenants/${schemaName}/attendance/cohort/${cohortId}`),
  get:      (schemaName: string, id: number) =>
              api<AttendanceResponse>(`/api/admin/tenants/${schemaName}/attendance/${id}`),
};
