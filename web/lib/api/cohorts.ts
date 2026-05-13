import "server-only";
import { api } from "./_client";
import type { CohortRequest, CohortResponse } from "../types";

export const cohortsApi = {
  list:    () => api<CohortResponse[]>("/api/instructor/cohorts"),
  get:     (id: number) => api<CohortResponse>(`/api/instructor/cohorts/${id}`),
  create:  (body: CohortRequest) => api<CohortResponse>("/api/instructor/cohorts", { method: "POST", body }),
  update:  (id: number, body: CohortRequest) => api<CohortResponse>(`/api/instructor/cohorts/${id}`, { method: "PUT", body }),
  remove:  (id: number) => api<void>(`/api/instructor/cohorts/${id}`, { method: "DELETE" }),
};
