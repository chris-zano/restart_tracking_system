import "server-only";
import { api } from "./_client";
import type { InstructorProvisionRequest, InstructorResponse } from "../types";

export const adminInstructorsApi = {
  list:       (schemaName: string) => api<InstructorResponse[]>(`/api/admin/instructors/${schemaName}`),
  provision:  (body: InstructorProvisionRequest) =>
                api<InstructorResponse>("/api/admin/instructors", { method: "POST", body }),
  remove:     (schemaName: string, username: string) =>
                api<void>(`/api/admin/instructors/${schemaName}/${username}`, { method: "DELETE" }),
};
