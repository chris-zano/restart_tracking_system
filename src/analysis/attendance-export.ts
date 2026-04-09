/**
 * Attendance Export - Generate CSV of learners meeting attendance threshold
 */

import type { AttendanceReport, LearnerAttendance } from "../types/attendance.types";

/**
 * Export record for a learner meeting pass threshold
 */
export interface AttendanceExportRecord {
  full_name: string;
  email: string;
  time_attendance_rate: number;
  sessions_attended: number;
  total_sessions: number;
  total_minutes_attended: number;
  total_minutes_possible: number;
  pass_threshold: number;
  export_timestamp: string;
}

/**
 * Escape CSV field (handle quotes, commas, newlines)
 */
function escapeCSVField(field: string | number): string {
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate CSV header row
 */
function generateCSVHeader(): string {
  return [
    "full_name",
    "email",
    "time_attendance_rate",
    "sessions_attended",
    "total_sessions",
    "total_minutes_attended",
    "total_minutes_possible",
    "pass_threshold",
    "export_timestamp",
  ]
    .map(escapeCSVField)
    .join(",");
}

/**
 * Generate CSV row for a learner
 */
function generateCSVRow(record: AttendanceExportRecord): string {
  return [
    record.full_name,
    record.email,
    record.time_attendance_rate.toFixed(2),
    record.sessions_attended,
    record.total_sessions,
    record.total_minutes_attended,
    record.total_minutes_possible,
    record.pass_threshold,
    record.export_timestamp,
  ]
    .map(escapeCSVField)
    .join(",");
}

/**
 * Filter learners meeting attendance threshold and generate export records
 */
export function generateAttendanceExportCSV(
  report: AttendanceReport,
  threshold: number,
): { csv: string; count: number; records: AttendanceExportRecord[] } {
  const timestamp = new Date().toISOString();

  // Filter learners meeting pass threshold, sorted descending by attendance rate
  const passingLearners = report.learnerAttendance
    .filter((l) => l.summary.timeAttendanceRate >= threshold)
    .sort((a, b) => b.summary.timeAttendanceRate - a.summary.timeAttendanceRate);

  // Generate export records
  const records: AttendanceExportRecord[] = passingLearners.map((learner) => ({
    full_name: learner.student.fullName,
    email: learner.student.email,
    time_attendance_rate: learner.summary.timeAttendanceRate,
    sessions_attended: learner.summary.sessionsAttended,
    total_sessions: learner.summary.totalSessions,
    total_minutes_attended: learner.summary.totalMinutesAttended,
    total_minutes_possible: learner.summary.totalMinutesPossible,
    pass_threshold: threshold,
    export_timestamp: timestamp,
  }));

  // Generate CSV
  const header = generateCSVHeader();
  const rows = records.map(generateCSVRow);
  const csv = [header, ...rows].join("\n");

  return {
    csv,
    count: records.length,
    records,
  };
}
