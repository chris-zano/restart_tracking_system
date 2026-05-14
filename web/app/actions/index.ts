"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { learnerSchema } from "@/lib/schemas";
import { instructorAttendanceApi } from "@/lib/api/attendance";
import { instructorLearnersApi, adminLearnersApi } from "@/lib/api/learners";
import { cohortsApi } from "@/lib/api/cohorts";
import { weeklyTargetsApi } from "@/lib/api/weekly-targets";
import { tracksApi } from "@/lib/api/tracks";
import { progressApi } from "@/lib/api/progress";
import { tenantsApi } from "@/lib/api/tenants";
import { adminInstructorsApi } from "@/lib/api/admin-instructors";
import { profileApi } from "@/lib/api/profile";
import { ApiError } from "@/lib/api/_client";
import { requireInstructor, requireAdmin } from "@/lib/auth";
import type {
  AttendanceRequest, CohortRequest, LearnerRequest,
  WeeklyTargetRequest, WeekNumber, TrackRequest, ProgressUploadRequest,
} from "@/lib/types";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const wrap = async <T,>(fn: () => Promise<T>): Promise<ActionResult<T>> => {
  try { return { ok: true, data: await fn() }; }
  catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
};

// ─── Cohorts ──────────────────────────────────────────────────────────────

const cohortSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trackId: z.coerce.number().int().positive().optional(),
});

export async function createCohort(tenant: string, body: CohortRequest) {
  await requireInstructor(tenant);
  const parsed = cohortSchema.parse(body);
  const r = await wrap(() => cohortsApi.create(parsed));
  if (r.ok) revalidatePath(`/${tenant}/instructor/cohorts`);
  return r;
}

export async function updateCohort(tenant: string, id: number, body: CohortRequest) {
  await requireInstructor(tenant);
  const parsed = cohortSchema.parse(body);
  const r = await wrap(() => cohortsApi.update(id, parsed));
  if (r.ok) revalidatePath(`/${tenant}/instructor/cohorts`);
  return r;
}

export async function deleteCohort(tenant: string, id: number) {
  await requireInstructor(tenant);
  const r = await wrap(() => cohortsApi.remove(id));
  if (r.ok) revalidatePath(`/${tenant}/instructor/cohorts`);
  return r;
}

// ─── Learners ─────────────────────────────────────────────────────────────

export async function createLearner(tenant: string, body: LearnerRequest) {
  await requireInstructor(tenant);
  const parsed = learnerSchema.parse(body);
  const r = await wrap(() => instructorLearnersApi.create(parsed));
  if (r.ok) revalidatePath(`/${tenant}/instructor/learners`);
  return r;
}

export async function bulkCreateLearners(tenant: string, body: LearnerRequest[]) {
  await requireInstructor(tenant);
  const errors: { row: number; error: string }[] = [];
  body.forEach((row, i) => {
    const r = learnerSchema.safeParse(row);
    if (!r.success) errors.push({ row: i + 1, error: r.error.issues.map(x => `${x.path.join(".")}: ${x.message}`).join("; ") });
  });
  if (errors.length) return { ok: false as const, error: `Validation failed`, rowErrors: errors };

  const r = await wrap(() => instructorLearnersApi.bulkCreate(body));
  if (r.ok) revalidatePath(`/${tenant}/instructor/learners`);
  return r;
}

export async function updateLearner(tenant: string, id: number, body: LearnerRequest) {
  await requireInstructor(tenant);
  const parsed = learnerSchema.parse(body);
  const r = await wrap(() => instructorLearnersApi.update(id, parsed));
  if (r.ok) revalidatePath(`/${tenant}/instructor/learners`);
  return r;
}

export async function deleteLearner(tenant: string, id: number) {
  await requireInstructor(tenant);
  const r = await wrap(() => instructorLearnersApi.remove(id));
  if (r.ok) revalidatePath(`/${tenant}/instructor/learners`);
  return r;
}

export async function deleteAdminLearner(schemaName: string, id: number) {
  await requireAdmin();
  const r = await wrap(() => adminLearnersApi.remove(schemaName, id));
  if (r.ok) revalidatePath(`/admin/tenants/${schemaName}`);
  return r;
}

// ─── Attendance ───────────────────────────────────────────────────────────

const attendanceSchema = z.object({
  cohortId: z.number().int().positive(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.number().int().positive(),
  participants: z.array(z.object({
    learnerId: z.number().int().positive(),
    duration: z.number().int().positive(),
  })).min(1),
});

export async function recordAttendance(tenant: string, body: AttendanceRequest) {
  await requireInstructor(tenant);
  const parsed = attendanceSchema.parse(body);
  const r = await wrap(() => instructorAttendanceApi.create(parsed));
  if (r.ok) revalidatePath(`/${tenant}/instructor/attendance`);
  return r;
}

export async function getAttendanceByCohort(tenant: string, cohortId: number) {
  await requireInstructor(tenant);
  return wrap(() => instructorAttendanceApi.byCohort(cohortId));
}

export async function updateAttendanceSession(tenant: string, id: number, body: AttendanceRequest) {
  await requireInstructor(tenant);
  const parsed = attendanceSchema.parse(body);
  return wrap(() => instructorAttendanceApi.update(id, parsed));
}

export async function deleteAttendanceSession(tenant: string, id: number) {
  await requireInstructor(tenant);
  return wrap(() => instructorAttendanceApi.remove(id));
}

// ─── Admin: tenants + instructors ─────────────────────────────────────────

export async function createTenant(instructorName: string) {
  await requireAdmin();
  const r = await wrap(() => tenantsApi.create({ instructorName }));
  if (r.ok) revalidatePath("/admin/tenants");
  return r;
}

export async function provisionInstructor(input: { schemaName: string; username: string; displayName: string; email: string }) {
  await requireAdmin();
  const r = await wrap(() => adminInstructorsApi.provision(input));
  if (r.ok) revalidatePath(`/admin/tenants/${input.schemaName}`);
  return r;
}

// ─── Admin: weekly targets ────────────────────────────────────────────────

const weeklyTargetSchema = z.object({
  trackId: z.number().int().positive(),
  weekNumber: z.string() as z.ZodType<WeekNumber>,
  labs: z.array(z.string().min(1)),
  knowledgeChecks: z.array(z.string().min(1)),
});

export async function upsertWeeklyTarget(body: WeeklyTargetRequest, existingId?: number) {
  await requireAdmin();
  const parsed = weeklyTargetSchema.parse(body);
  const r = await wrap(() =>
    existingId
      ? weeklyTargetsApi.update(existingId, parsed)
      : weeklyTargetsApi.create(parsed)
  );
  if (r.ok) revalidatePath("/admin/weekly-targets");
  return r;
}

// ─── Admin: tracks ────────────────────────────────────────────────────────

const trackSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
});

export async function createTrack(body: TrackRequest) {
  await requireAdmin();
  const parsed = trackSchema.parse(body);
  const r = await wrap(() => tracksApi.create(parsed));
  if (r.ok) revalidatePath("/admin/tracks");
  return r;
}

export async function updateTrack(id: number, body: TrackRequest) {
  await requireAdmin();
  const parsed = trackSchema.parse(body);
  const r = await wrap(() => tracksApi.update(id, parsed));
  if (r.ok) revalidatePath("/admin/tracks");
  return r;
}

export async function deleteTrack(id: number) {
  await requireAdmin();
  const r = await wrap(() => tracksApi.remove(id));
  if (r.ok) revalidatePath("/admin/tracks");
  return r;
}

// ─── Instructor: profile ──────────────────────────────────────────────────

export async function updateProfile(tenant: string, body: { displayName: string; email: string }) {
  await requireInstructor(tenant);
  const r = await wrap(() => profileApi.update(body));
  if (r.ok) revalidatePath(`/${tenant}/instructor/profile`);
  return r;
}

export async function changePassword(tenant: string, body: { currentPassword: string; newPassword: string }) {
  await requireInstructor(tenant);
  return wrap(() => profileApi.changePassword(body));
}

// ─── Instructor: progress report ──────────────────────────────────────────

export async function generateProgressReport(tenant: string, body: ProgressUploadRequest) {
  await requireInstructor(tenant);
  return wrap(() => progressApi.report(body));
}

export async function getSavedProgressReport(tenant: string, cohortId: number) {
  await requireInstructor(tenant);
  return wrap(() => progressApi.getSaved(cohortId));
}

export async function clearProgressReport(tenant: string, cohortId: number) {
  await requireInstructor(tenant);
  return wrap(() => progressApi.delete(cohortId));
}
