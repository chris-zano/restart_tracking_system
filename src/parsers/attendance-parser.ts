/**
 * Parser for Zoom attendance CSV files
 */

import { readAndParseCSV, fileExists, listFiles } from "../utils/file-utils";
import { parseAttendanceName } from "../utils/name-normalizer";
import { logger } from "../utils/logger";
import type { Result } from "../types/common.types";
import type {
  SessionMetadata,
  AttendeeRecord,
  AttendanceSession,
  AttendanceParseContext,
} from "../types/attendance.types";

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function getFileName(filePath: string): string {
  return filePath.split("/").pop() || filePath.split("\\").pop() || filePath;
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

function toSessionDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseZoomDateTime(value: string): Date | null {
  const trimmed = value.trim().replace(/^"|"$/g, "");
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i,
  );

  if (!match) {
    return null;
  }

  const [, monthText, dayText, yearText, hourText, minuteText, secondText, meridiem] =
    match;
  const month = Number.parseInt(monthText, 10) - 1;
  const day = Number.parseInt(dayText, 10);
  const rawYear = Number.parseInt(yearText, 10);
  const year = yearText.length === 2 ? 2000 + rawYear : rawYear;
  let hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);
  const second = Number.parseInt(secondText || "0", 10);

  if (meridiem) {
    const upperMeridiem = meridiem.toUpperCase();
    if (upperMeridiem === "PM" && hour < 12) {
      hour += 12;
    }
    if (upperMeridiem === "AM" && hour === 12) {
      hour = 0;
    }
  }

  const parsed = new Date(year, month, day, hour, minute, second);
  return isValidDate(parsed) ? parsed : null;
}

function applyTimeToDate(baseDate: Date, timeSource: Date | null): Date {
  if (!timeSource || !isValidDate(timeSource)) {
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  }

  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
  );
}

function extractSessionDateFromFileName(fileName: string): Date {
  const baseName = fileName.replace(/\.csv$/i, "");
  const parts = baseName.split(/[_\s-]+/).filter(Boolean);

  if (parts.length < 3) {
    throw new Error(`Could not extract date from filename: ${fileName}`);
  }

  const dateParts = parts.slice(-3);
  const dayMatch = dateParts[0]?.match(/^(\d{1,2})(?:st|nd|rd|th)?$/i);
  const monthName = dateParts[1]?.toLowerCase();
  const yearText = dateParts[2];

  if (!dayMatch || !monthName || !yearText) {
    throw new Error(`Could not extract date from filename: ${fileName}`);
  }

  const day = Number.parseInt(dayMatch[1], 10);
  const month = MONTH_INDEX[monthName];
  const rawYear = Number.parseInt(yearText, 10);
  const year = yearText.length === 2 ? 2000 + rawYear : rawYear;

  if (month === undefined || Number.isNaN(rawYear)) {
    throw new Error(`Could not extract date from filename: ${fileName}`);
  }

  const parsed = new Date(year, month, day);
  if (!isValidDate(parsed)) {
    throw new Error(`Extracted invalid date from filename: ${fileName}`);
  }

  return parsed;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findHeaderIndex(
  headerRow: string[],
  matcher: (header: string) => boolean,
): number {
  return headerRow.findIndex((header) => matcher(normalizeHeader(header)));
}

function buildAttendanceParseContext(rows: string[][], fileName: string): Result<AttendanceParseContext> {
  const metadataRow = rows[1];
  if (!metadataRow) {
    return {
      success: false,
      error: `Invalid attendance file: missing metadata row in ${fileName}`,
    };
  }

  const headerRowIndex = rows.findIndex((row, index) => {
    if (index < 2 || !row) {
      return false;
    }

    const normalizedHeaders = row.map(normalizeHeader);
    return normalizedHeaders.some((header) => header.includes("name"));
  });

  if (headerRowIndex === -1) {
    return {
      success: false,
      error: `Invalid attendance file: missing attendee header row in ${fileName}`,
    };
  }

  const headerRow = rows[headerRowIndex] || [];

  return {
    success: true,
    data: {
      fileName,
      metadataRow,
      headerRow,
      dataStartRow: headerRowIndex + 1,
    },
  };
}

/**
 * Parse session metadata from row 1 of attendance CSV
 *
 * Format: Topic,ID,Host,Duration (minutes),Start time,End time,Participants
 * Note: Some files have an extra empty column, so we search for values
 */
function parseSessionMetadata(
  headerRow: string[],
  row: string[],
  fileName: string,
): SessionMetadata {
  const topicIndex = findHeaderIndex(headerRow, (header) => header === "topic");
  const idIndex = findHeaderIndex(headerRow, (header) => header === "id");
  const hostIndex = findHeaderIndex(headerRow, (header) => header === "host");
  const durationIndex = findHeaderIndex(
    headerRow,
    (header) => header.includes("duration"),
  );
  const startTimeIndex = findHeaderIndex(
    headerRow,
    (header) => header.includes("start time"),
  );
  const endTimeIndex = findHeaderIndex(
    headerRow,
    (header) => header.includes("end time"),
  );
  const participantsIndex = findHeaderIndex(
    headerRow,
    (header) => header.includes("participants"),
  );

  const duration =
    durationIndex >= 0
      ? Number.parseInt(row[durationIndex]?.replace(/[^\d]/g, "") || "0", 10) || 0
      : 0;

  const sessionDate = extractSessionDateFromFileName(fileName);
  const parsedStartTime =
    startTimeIndex >= 0 ? parseZoomDateTime(row[startTimeIndex] || "") : null;
  const parsedEndTime =
    endTimeIndex >= 0 ? parseZoomDateTime(row[endTimeIndex] || "") : null;
  const startTime = applyTimeToDate(sessionDate, parsedStartTime);

  let endTime = applyTimeToDate(sessionDate, parsedEndTime);
  if (duration > 0 && endTime.getTime() <= startTime.getTime()) {
    endTime = new Date(startTime.getTime() + duration * 60 * 1000);
  }

  return {
    topic: topicIndex >= 0 ? row[topicIndex] || "" : "",
    id: idIndex >= 0 ? row[idIndex] || "" : "",
    host: hostIndex >= 0 ? row[hostIndex] || "" : "",
    duration,
    startTime,
    endTime,
    participantCount:
      participantsIndex >= 0
        ? Number.parseInt(row[participantsIndex] || "0", 10) || 0
        : 0,
  };
}

/**
 * Parse attendee record from data row
 *
 * Format: Name (original name),Email,Total duration (minutes),Guest
 */
function parseAttendeeRecord(
  row: string[],
  headerRow: string[],
): AttendeeRecord {
  const nameIndex = findHeaderIndex(headerRow, (header) => header.includes("name"));
  const emailIndex = findHeaderIndex(headerRow, (header) => header === "email");
  const durationIndex = findHeaderIndex(
    headerRow,
    (header) => header.includes("total duration"),
  );
  const guestIndex = findHeaderIndex(headerRow, (header) => header === "guest");

  const rawName = nameIndex >= 0 ? row[nameIndex] || "" : row[0] || "";
  const email = emailIndex >= 0 ? row[emailIndex] || "" : "";
  const duration =
    durationIndex >= 0 ? Number.parseInt(row[durationIndex] || "0", 10) || 0 : 0;
  const isGuest =
    guestIndex >= 0 ? row[guestIndex]?.toLowerCase().includes("yes") || false : false;

  const { cleanName } = parseAttendanceName(rawName);

  return {
    name: cleanName,
    originalName: rawName,
    email,
    durationMinutes: duration,
    isGuest,
  };
}

/**
 * Parse a single attendance CSV file
 */
export async function parseAttendanceFile(
  filePath: string,
): Promise<Result<AttendanceSession>> {
  try {
    const fileName = getFileName(filePath);
    const exists = await fileExists(filePath);
    if (!exists) {
      return {
        success: false,
        error: `Attendance file not found: ${filePath}`,
      };
    }

    const rows = await readAndParseCSV(filePath);

    if (rows.length < 5) {
      return {
        success: false,
        error: `Invalid attendance file: insufficient rows`,
      };
    }

    const contextResult = buildAttendanceParseContext(rows, fileName);
    if (!contextResult.success) {
      return contextResult;
    }

    const context = contextResult.data;
    const metadata = parseSessionMetadata(rows[0] || [], context.metadataRow, fileName);

    const attendees: AttendeeRecord[] = [];
    for (let i = context.dataStartRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      // Skip empty rows
      if (!row[0] || row[0].trim() === "") continue;

      // Skip rows where duration is 0 or empty
      const durationIndex = findHeaderIndex(
        context.headerRow,
        (header) => header.includes("total duration"),
      );
      const duration =
        durationIndex >= 0 ? Number.parseInt(row[durationIndex] || "0", 10) : 0;
      if (!duration || duration === 0) continue;

      const attendee = parseAttendeeRecord(row, context.headerRow);
      attendees.push(attendee);
    }

    // Calculate stats
    const totalDuration = attendees.reduce(
      (sum, a) => sum + a.durationMinutes,
      0,
    );
    const averageDuration =
      attendees.length > 0 ? totalDuration / attendees.length : 0;

    return {
      success: true,
      data: {
        metadata,
        attendees,
        fileName,
        stats: {
          totalAttendees: attendees.length,
          averageDuration,
          attendanceRate: 0, // Will be calculated later when we have class list
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse attendance file: ${error}`,
      details: error,
    };
  }
}

/**
 * Parse all attendance files in the attendance_reports directory
 */
export async function parseAllAttendance(
  basePath: string,
): Promise<Result<AttendanceSession[]>> {
  try {
    const attendanceDir = `${basePath}/attendance_reports`;

    // List all CSV files
    const files = await listFiles(attendanceDir, /\.csv$/i);

    if (files.length === 0) {
      return {
        success: false,
        error: `No attendance CSV files found in ${attendanceDir}`,
      };
    }

    const sessionsByDate = new Map<string, AttendanceSession>();
    const errors: string[] = [];

    for (const file of files) {
      const filePath = `${attendanceDir}/${file}`;
      const result = await parseAttendanceFile(filePath);

      if (result.success) {
        const dateKey = toSessionDateKey(result.data.metadata.startTime);
        const existing = sessionsByDate.get(dateKey);

        if (!existing) {
          sessionsByDate.set(dateKey, result.data);
          continue;
        }

        const replacement =
          result.data.attendees.length > existing.attendees.length ||
          (result.data.attendees.length === existing.attendees.length &&
            result.data.metadata.duration > existing.metadata.duration)
            ? result.data
            : existing;

        if (replacement !== existing) {
          logger.warn(
            `Duplicate attendance date ${dateKey}; keeping ${replacement.fileName} over ${existing.fileName}`,
          );
          sessionsByDate.set(dateKey, replacement);
        } else {
          logger.warn(
            `Duplicate attendance date ${dateKey}; keeping ${existing.fileName} and skipping ${result.data.fileName}`,
          );
        }
      } else {
        errors.push(`${file}: ${result.error}`);
      }
    }

    const sessions = Array.from(sessionsByDate.values());

    if (sessions.length === 0) {
      return {
        success: false,
        error: `Failed to parse any attendance files`,
        details: errors,
      };
    }

    if (errors.length > 0) {
      logger.warn(`Some attendance files failed to parse:`, errors);
    }

    // Sort sessions by start time
    sessions.sort(
      (a, b) => a.metadata.startTime.getTime() - b.metadata.startTime.getTime(),
    );

    return {
      success: true,
      data: sessions,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read attendance directory: ${error}`,
      details: error,
    };
  }
}
