/**
 * Attendance Loader
 * Matches attendees to class list and builds comprehensive attendance report
 */

import { parseAllAttendance } from "../parsers/attendance-parser";
import { getStudentsFromIndex } from "../parsers/class-list-parser";
import {
  resolveAttendanceName,
  NON_CLASS_ATTENDEES,
} from "../config/learner-index";
import type {
  AttendanceReport,
  AttendanceSession,
  LearnerAttendance,
  AttendeeRecord,
} from "../types/attendance.types";
import type { Student, Result, DateRange } from "../types/common.types";

/** Lower-cased set for fast non-class attendee lookup */
const NON_CLASS_SET = new Set(NON_CLASS_ATTENDEES.map((n) => n.toLowerCase()));

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

/**
 * Load complete attendance report with matched students
 */
export async function loadAttendanceReport(
  basePath: string,
): Promise<Result<AttendanceReport>> {
  try {
    // Build student list from the canonical learner index
    const students = getStudentsFromIndex();

    // Load all attendance sessions
    const attendanceResult = await parseAllAttendance(basePath);
    if (!attendanceResult.success) {
      return {
        success: false,
        error: `Failed to load attendance: ${attendanceResult.error}`,
      };
    }

    const sessions = attendanceResult.data;

    // Build email → student lookup for fast resolution
    const emailToStudent = new Map<string, Student>();
    const nameToStudent = new Map<string, Student>();
    for (const student of students) {
      emailToStudent.set(student.email.toLowerCase(), student);
      nameToStudent.set(student.fullName.toLowerCase(), student);
    }

    // Match attendees to students
    const unmatchedAttendees: Array<{
      session: string;
      name: string;
      email: string;
      reason: string;
    }> = [];

    const matchedSessions: AttendanceSession[] = sessions.map((session) => {
      const matchedAttendees = session.attendees
        // Drop attendees who are known non-class participants
        .filter((attendee) => {
          const lc = attendee.name.toLowerCase();
          const lcOrig = attendee.originalName?.toLowerCase() ?? "";
          return !NON_CLASS_SET.has(lc) && !NON_CLASS_SET.has(lcOrig);
        })
        .map((attendee) => {
          // 1. Exact email match (early Zoom sessions had emails)
          if (attendee.email) {
            const byEmail = emailToStudent.get(attendee.email.toLowerCase());
            if (byEmail) {
              return {
                ...attendee,
                matchedStudent: byEmail,
                matchConfidence: 1.0,
              };
            }
          }

          // 2. Alias lookup via learner index (canonical, case-insensitive)
          const canonical =
            resolveAttendanceName(attendee.name) ??
            resolveAttendanceName(attendee.originalName ?? "");

          if (canonical) {
            const byCanonical = nameToStudent.get(canonical.toLowerCase());
            if (byCanonical) {
              return {
                ...attendee,
                matchedStudent: byCanonical,
                matchConfidence: 1.0,
              };
            }
          }

          // 3. No match — record as unmatched
          unmatchedAttendees.push({
            session: session.fileName,
            name: attendee.name,
            email: attendee.email,
            reason: "Name not found in learner index aliases",
          });

          return attendee;
        });

      return {
        ...session,
        attendees: matchedAttendees,
      };
    });

    // Build learner attendance records
    const learnerAttendance = buildLearnerAttendance(students, matchedSessions);

    // Calculate date range
    const dates = matchedSessions
      .map((s) => s.metadata.startTime)
      .filter(isValidDate);
    if (dates.length === 0) {
      return {
        success: false,
        error: "Attendance sessions did not contain any valid dates",
      };
    }

    const dateRange: DateRange = {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))),
      end: new Date(Math.max(...dates.map((d) => d.getTime()))),
    };

    // Calculate overall statistics
    const stats = calculateAttendanceStats(learnerAttendance, matchedSessions);

    const report: AttendanceReport = {
      sessions: matchedSessions,
      learnerAttendance,
      dateRange,
      stats,
      unmatchedAttendees,
    };

    return {
      success: true,
      data: report,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error loading attendance report: ${error}`,
    };
  }
}

/**
 * Build per-learner attendance records
 */
function buildLearnerAttendance(
  students: Student[],
  sessions: AttendanceSession[],
): LearnerAttendance[] {
  return students.map((student) => {
    const studentSessions = sessions.map((session) => {
      // Find this student in the session attendees
      const attendeeRecord = session.attendees.find(
        (a) => a.matchedStudent?.email === student.email,
      );

      const attended = !!attendeeRecord;
      const durationMinutes = attendeeRecord?.durationMinutes ?? 0;
      const attendancePercentage =
        session.metadata.duration > 0
          ? (durationMinutes / session.metadata.duration) * 100
          : 0;

      return {
        session: session.metadata,
        attended,
        durationMinutes,
        attendancePercentage,
      };
    });

    // Calculate summary
    const totalSessions = sessions.length;
    const sessionsAttended = studentSessions.filter((s) => s.attended).length;
    const attendanceRate =
      totalSessions > 0 ? (sessionsAttended / totalSessions) * 100 : 0;

    const totalMinutesAttended = studentSessions.reduce(
      (sum, s) => sum + s.durationMinutes,
      0,
    );
    const totalMinutesPossible = sessions.reduce(
      (sum, s) => sum + s.metadata.duration,
      0,
    );
    const timeAttendanceRate =
      totalMinutesPossible > 0
        ? (totalMinutesAttended / totalMinutesPossible) * 100
        : 0;

    const averageDurationPerSession =
      totalSessions > 0 ? totalMinutesAttended / totalSessions : 0;

    return {
      student,
      sessions: studentSessions,
      summary: {
        totalSessions,
        sessionsAttended,
        attendanceRate,
        totalMinutesAttended,
        totalMinutesPossible,
        timeAttendanceRate,
        averageDurationPerSession,
      },
    };
  });
}

/**
 * Calculate overall attendance statistics
 */
function calculateAttendanceStats(
  learnerAttendance: LearnerAttendance[],
  sessions: AttendanceSession[],
): AttendanceReport["stats"] {
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce(
    (sum, s) => sum + s.metadata.duration,
    0,
  );
  const averageSessionDuration =
    totalSessions > 0 ? totalMinutes / totalSessions : 0;

  const averageAttendanceRate =
    learnerAttendance.length > 0
      ? learnerAttendance.reduce(
          (sum, l) => sum + l.summary.attendanceRate,
          0,
        ) / learnerAttendance.length
      : 0;

  // Attendance distribution
  let perfectAttendance = 0;
  let goodAttendance = 0;
  let fairAttendance = 0;
  let poorAttendance = 0;

  for (const learner of learnerAttendance) {
    const rate = learner.summary.attendanceRate;
    if (rate === 100) {
      perfectAttendance++;
    } else if (rate >= 80) {
      goodAttendance++;
    } else if (rate >= 60) {
      fairAttendance++;
    } else {
      poorAttendance++;
    }
  }

  return {
    totalSessions,
    totalMinutes,
    averageSessionDuration,
    averageAttendanceRate,
    perfectAttendance,
    goodAttendance,
    fairAttendance,
    poorAttendance,
  };
}
