/**
 * Types for attendance data
 */

import type { Student, DateRange } from "./common.types";

/**
 * Single attendance session metadata (from row 1 of CSV)
 */
export interface SessionMetadata {
  topic: string; // "Christian_Jan26_Restart"
  id: string; // "85705062932"
  host: string; // "Christian Solomon (email)"
  duration: number; // Total session duration in minutes
  startTime: Date;
  endTime: Date;
  participantCount: number;
}

/**
 * Individual attendee record
 */
export interface AttendeeRecord {
  name: string; // Name from Zoom (may differ from class list)
  originalName: string; // "Name (original name)" from CSV
  email: string; // May be empty
  durationMinutes: number; // Time attended
  isGuest: boolean; // Guest status

  // Matched student from class list
  matchedStudent?: Student;
  matchConfidence?: number; // 0-1, for fuzzy matching
}

/**
 * Single session's complete data
 */
export interface AttendanceSession {
  metadata: SessionMetadata;
  attendees: AttendeeRecord[];
  fileName: string;

  // Calculated stats
  stats: {
    totalAttendees: number;
    averageDuration: number;
    attendanceRate: number; // % of expected students
  };
}

/**
 * Learner's attendance across all sessions
 */
export interface LearnerAttendance {
  student: Student;

  // Session-by-session breakdown
  sessions: Array<{
    session: SessionMetadata;
    attended: boolean;
    durationMinutes: number;
    attendancePercentage: number; // duration / session.duration * 100
  }>;

  // Summary
  summary: {
    totalSessions: number;
    sessionsAttended: number;
    attendanceRate: number; // sessionsAttended / totalSessions * 100
    totalMinutesAttended: number;
    totalMinutesPossible: number;
    timeAttendanceRate: number; // totalMinutesAttended / totalMinutesPossible * 100
    averageDurationPerSession: number;
  };
}

/**
 * Complete attendance report across all sessions
 */
export interface AttendanceReport {
  sessions: AttendanceSession[];
  learnerAttendance: LearnerAttendance[];

  // Date range
  dateRange: DateRange;

  // Overall statistics
  stats: {
    totalSessions: number;
    totalMinutes: number;
    averageSessionDuration: number;
    averageAttendanceRate: number;

    // Attendance distribution
    perfectAttendance: number; // 100% sessions
    goodAttendance: number; // 80-99%
    fairAttendance: number; // 60-79%
    poorAttendance: number; // <60%
  };

  // Unmatched records (for review)
  unmatchedAttendees: Array<{
    session: string;
    name: string;
    email: string;
    reason: string;
  }>;
}

/**
 * Attendance parsing context
 */
export interface AttendanceParseContext {
  fileName: string;
  metadataRow: string[];
  headerRow: string[];
  dataStartRow: number;
}
