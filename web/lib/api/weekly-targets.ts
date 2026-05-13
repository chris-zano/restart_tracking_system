import "server-only";
import { api } from "./_client";
import type { WeeklyTargetRequest, WeeklyTargetResponse, WeekNumber } from "../types";

/** Admin-only — full CRUD. */
export const weeklyTargetsApi = {
  byTrack:    (trackId: number) => api<WeeklyTargetResponse[]>(`/api/admin/weekly-targets/track/${trackId}`),
  byWeek:     (trackId: number, week: WeekNumber) =>
                api<WeeklyTargetResponse>(`/api/admin/weekly-targets/track/${trackId}/week/${week}`),
  get:        (id: number) => api<WeeklyTargetResponse>(`/api/admin/weekly-targets/${id}`),
  create:     (body: WeeklyTargetRequest) =>
                api<WeeklyTargetResponse>("/api/admin/weekly-targets", { method: "POST", body }),
  update:     (id: number, body: WeeklyTargetRequest) =>
                api<WeeklyTargetResponse>(`/api/admin/weekly-targets/${id}`, { method: "PUT", body }),
  remove:     (id: number) => api<void>(`/api/admin/weekly-targets/${id}`, { method: "DELETE" }),
};

/** Instructor-accessible — read-only. */
export const instructorWeeklyTargetsApi = {
  byTrack: (trackId: number) =>
    api<WeeklyTargetResponse[]>(`/api/instructor/weekly-targets/track/${trackId}`),
};
