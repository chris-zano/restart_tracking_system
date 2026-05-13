import "server-only";
import { api } from "./_client";
import type { ProgressUploadRequest, ProgressReportResponse } from "../types";

export const progressApi = {
  report: (body: ProgressUploadRequest) =>
    api<ProgressReportResponse>("/api/instructor/progress/report", {
      method: "POST",
      body,
    }),
  getSaved: (cohortId: number) =>
    api<ProgressReportResponse>(`/api/instructor/progress/report/cohort/${cohortId}`),
};

