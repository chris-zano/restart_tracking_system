import "server-only";
import { api } from "./_client";
import type { TrackRequest, TrackResponse } from "../types";

/** Admin-only — full CRUD. */
export const tracksApi = {
  list:   ()                          => api<TrackResponse[]>("/api/admin/tracks"),
  get:    (id: number)                => api<TrackResponse>(`/api/admin/tracks/${id}`),
  create: (body: TrackRequest)        => api<TrackResponse>("/api/admin/tracks", { method: "POST", body }),
  update: (id: number, body: TrackRequest) =>
            api<TrackResponse>(`/api/admin/tracks/${id}`, { method: "PUT", body }),
  remove: (id: number)                => api<void>(`/api/admin/tracks/${id}`, { method: "DELETE" }),
};

/** Instructor-accessible read-only tracks list. */
export const instructorTracksApi = {
  list: () => api<TrackResponse[]>("/api/instructor/tracks"),
};

