/**
 * Restart API — TypeScript types generated from the OpenAPI spec.
 *
 * Hand-written rather than codegen'd so they stay readable and so the
 * envelope wrappers feel ergonomic. Keep in sync with the spec — search the
 * spec for the type name and you'll find its source of truth.
 */

// ─── Enums ────────────────────────────────────────────────────────────────

export type Role = "ADMIN" | "INSTRUCTOR";

export type WeekNumber =
  | "WEEK_1" | "WEEK_2" | "WEEK_3" | "WEEK_4" | "WEEK_5"
  | "WEEK_6" | "WEEK_7" | "WEEK_8" | "WEEK_9" | "WEEK_10";

export const WEEK_NUMBERS: WeekNumber[] = [
  "WEEK_1","WEEK_2","WEEK_3","WEEK_4","WEEK_5",
  "WEEK_6","WEEK_7","WEEK_8","WEEK_9","WEEK_10",
];

export type ResourceType =
  | "LEARNER" | "COHORT" | "ATTENDANCE"
  | "INSTRUCTOR" | "WEEKLY_TARGET" | "TENANT" | "TRACK";

// ─── Envelope ─────────────────────────────────────────────────────────────

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

// ─── Auth ─────────────────────────────────────────────────────────────────

export type LoginRequest = { username: string; password: string };

export type LoginResponse = { token: string };

/** Decoded JWT claims. Mirrors the BearerAuth securityScheme. */
export type SessionClaims = {
  sub: string;        // username
  role: Role;
  tenantId: string | null;
  exp: number;        // unix seconds
};

// ─── Tenants ──────────────────────────────────────────────────────────────

export type TenantRequest = { instructorName: string };

export type TenantResponse = {
  id: number;
  schemaName: string;
  instructorName: string;
  active: boolean;
  createdAt: string;
};

// ─── Instructors (admin-side provisioning) ────────────────────────────────

export type InstructorProvisionRequest = {
  schemaName: string;
  username: string;
  password: string;
};

export type InstructorResponse = {
  id: number;
  username: string;
  schemaName: string;
  role: Role;
  active: boolean;
  createdAt: string;
};

// ─── Cohorts ──────────────────────────────────────────────────────────────

export type CohortRequest = {
  name: string;
  description?: string;
  trackId?: number;
};

export type CohortResponse = {
  id: number;
  name: string;
  description: string;
  trackId: number | null;
  active: boolean;
  createdAt: string;
};

// ─── Learners ─────────────────────────────────────────────────────────────

export type LearnerRequest = {
  fullname: string;
  email: string;
  /** 10-digit Ghanaian mobile, e.g. 0241234567 — pattern ^0[2-5]\d{8}$ */
  phone: string;
  gender?: string | null;
  location?: string | null;
  region?: string | null;
  institution?: string | null;
  graduated?: boolean;
  cohortId?: number;
};

export type LearnerResponse = {
  id: number;
  fullname: string;
  email: string;
  phone: string;
  gender: string | null;
  location: string | null;
  region: string | null;
  institution: string | null;
  graduated: boolean;
  cohortId: number | null;
  createdAt: string;
};

// ─── Attendance ───────────────────────────────────────────────────────────

export type ParticipantEntry = {
  learnerId: number;
  /** Minutes the learner was actually present (may differ from session total). */
  duration: number;
};

export type AttendanceRequest = {
  cohortId: number;
  /** ISO date — yyyy-mm-dd */
  sessionDate: string;
  /** Total session duration in minutes. */
  duration: number;
  participants: ParticipantEntry[];
};

export type AttendanceResponse = {
  id: number;
  cohortId: number;
  sessionDate: string;
  duration: number;
  participants: ParticipantEntry[];
  createdAt: string;
};

// ─── Weekly targets ───────────────────────────────────────────────────────

export type WeeklyTargetRequest = {
  trackId: number;
  weekNumber: WeekNumber;
  /** Names of lab tasks for this week. The Assignment Report matches Canvas
   *  gradebook columns to these names — keep them stable once published. */
  labs: string[];
  knowledgeChecks: string[];
};

export type WeeklyTargetResponse = {
  id: number;
  trackId: number;
  weekNumber: WeekNumber;
  labs: string[];
  knowledgeChecks: string[];
  createdAt: string;
};

// ─── Audit logs ───────────────────────────────────────────────────────────

export type AuditLogResponse = {
  id: number;
  actorUsername: string;
  actorRole: Role;
  tenantId: string | null;
  action: string | null;
  resourceType: string | null;
  resourceId: number | null;
  details: string | null;
  ipAddress: string;
  httpMethod: string;
  endpointPath: string;
  httpStatus: number;
  createdAt: string;
};

export type AuditLogQuery = {
  actorUsername?: string;
  tenantId?: string;
  resourceType?: ResourceType;
  action?: string;
  page?: number;
  size?: number;
};

export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  /** 0-indexed */
  number: number;
};

// ─── Tracks ───────────────────────────────────────────────────────────────

export type TrackRequest = {
  name: string;
  description?: string | null;
};

export type TrackResponse = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
};

// ─── Progress report ──────────────────────────────────────────────────────

export type StudentGradebookEntry = {
  studentName: string;
  /** SIS Login ID / email from the gradebook — used for strict email matching on the backend. */
  email?: string;
  /** Canvas column header → raw score string ("" or null means not submitted). */
  scores: Record<string, string>;
};

export type ProgressUploadRequest = {
  cohortId: number;
  students: StudentGradebookEntry[];
};

export type ItemProgress = {
  title: string;
  completed: boolean;
  score: string | null;
  foundInGradebook: boolean;
};

export type WeekProgress = {
  weekNumber: string;
  labs: ItemProgress[];
  knowledgeChecks: ItemProgress[];
  labsCompleted: number;
  labsTotal: number;
  kcCompleted: number;
  kcTotal: number;
};

export type LearnerProgress = {
  learnerId: number | null;
  learnerDbName: string | null;
  gradebookName: string;
  matched: boolean;
  weeks: WeekProgress[];
};

export type ProgressReportResponse = {
  cohortId: number;
  cohortName: string;
  learners: LearnerProgress[];
  uploadedAt?: string;
};

// ─── Frontend-only types ──────────────────────────────────────────────────

/** @deprecated Use TrackResponse from the API instead. Kept temporarily for backwards compatibility. */
export type Track = {
  id: number;
  code: string;
  name: string;
  short: string;
  color: string;
  weeks: number;
};

/** Result of parsing a Zoom participants CSV (client-side, before mapping). */
export type ZoomCsvRow = {
  name: string;
  duration: number;
};

/** Result of matching a Zoom row to a learner. */
export type ZoomMatchKind = "exact" | "manual" | "fuzzy" | "unmatched";
export type ZoomMatchedRow = {
  idx: number;
  csvName: string;
  csvDuration: number;
  learnerId: number | null;
  kind: ZoomMatchKind;
};

/** One row of a parsed Canvas gradebook. */
export type GradebookRow = {
  learnerName: string;
  email?: string;
  /** assignmentName -> raw score (or "" / null). */
  scores: Record<string, string | number | null>;
};
