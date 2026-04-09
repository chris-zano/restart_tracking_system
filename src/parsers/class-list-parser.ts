/**
 * Parser for class list CSV (maps student names to emails)
 */

import { readAndParseCSV, fileExists } from "../utils/file-utils";
import { parseCanvasName, normalizeName } from "../utils/name-normalizer";
import { logger } from "../utils/logger";
import { LEARNER_INDEX } from "../config/learner-index";
import type { Result, Student } from "../types/common.types";

/**
 * Build the canonical Student[] list directly from LEARNER_INDEX.
 * This is the preferred method — it uses the single source of truth
 * rather than re-parsing the CSV file.
 */
export function getStudentsFromIndex(): Student[] {
  return LEARNER_INDEX.map((learner) => ({
    fullName: learner.canonicalName,
    email: learner.email,
    normalizedName: normalizeName(learner.canonicalName),
  }));
}

/**
 * Parse the class list CSV file
 *
 * Expected format:
 * Full Name,Emails
 * Priscilla Dardey,priscadardey2905@gmail.com
 * ...
 */
export async function parseClassList(
  filePath: string,
): Promise<Result<Student[]>> {
  try {
    const exists = await fileExists(filePath);
    if (!exists) {
      return {
        success: false,
        error: `Class list file not found: ${filePath}`,
      };
    }

    const rows = await readAndParseCSV(filePath);

    if (rows.length < 2) {
      return {
        success: false,
        error: `Invalid class list: insufficient rows`,
      };
    }

    // Row 0: Headers (Full Name,Emails)
    const headers = rows[0];
    if (!headers) {
      return {
        success: false,
        error: `Invalid class list: missing header row`,
      };
    }
    const nameColIndex = headers.findIndex((h) =>
      h.toLowerCase().includes("name"),
    );
    const emailColIndex = headers.findIndex((h) =>
      h.toLowerCase().includes("email"),
    );

    if (nameColIndex === -1 || emailColIndex === -1) {
      return {
        success: false,
        error: `Invalid class list headers: expected "Full Name" and "Emails" columns`,
      };
    }

    // Parse student records
    const students: Student[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const fullName = row[nameColIndex]?.trim();
      const email = row[emailColIndex]?.trim();

      if (!fullName || !email) {
        errors.push(`Row ${i + 1}: Missing name or email`);
        continue;
      }

      // Validate email format
      if (!email.includes("@")) {
        errors.push(`Row ${i + 1}: Invalid email format: ${email}`);
        continue;
      }

      students.push({
        fullName,
        email,
        normalizedName: normalizeName(fullName),
      });
    }

    if (students.length === 0) {
      return {
        success: false,
        error: `No valid student records found in class list`,
        details: errors,
      };
    }

    if (errors.length > 0) {
      logger.warn(`Class list parsing warnings:`, errors);
    }

    return {
      success: true,
      data: students,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse class list: ${error}`,
      details: error,
    };
  }
}

/**
 * Create a lookup map from email to student
 */
export function createEmailLookup(students: Student[]): Map<string, Student> {
  const map = new Map<string, Student>();
  for (const student of students) {
    map.set(student.email.toLowerCase(), student);
  }
  return map;
}

/**
 * Create a lookup map from normalized name to student
 */
export function createNameLookup(students: Student[]): Map<string, Student> {
  const map = new Map<string, Student>();
  for (const student of students) {
    map.set(student.normalizedName, student);
  }
  return map;
}
