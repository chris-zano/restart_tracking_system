/**
 * Parser for weekly target CSV files
 */

import { readAndParseCSV, fileExists } from "../utils/file-utils";
import { parseAssessment } from "../utils/assessment-name-extractor";
import { logger } from "../utils/logger";
import type { Assessment, WeekNumber, Result } from "../types/common.types";
import type {
  WeeklyTarget,
  WeeklyTargetCSV,
} from "../types/weekly-targets.types";

/**
 * Parse a single weekly target CSV file
 *
 * Expected structure:
 * Row 1: LABS,KCS
 * Row 2: SIS Login ID(,SIS Login ID( [skip this]
 * Row 3+: Lab/KC entries with IDs
 */
export async function parseWeeklyTargetFile(
  filePath: string,
  week: WeekNumber,
): Promise<Result<WeeklyTarget>> {
  try {
    // Check if file exists
    const exists = await fileExists(filePath);
    if (!exists) {
      return {
        success: false,
        error: `Weekly target file not found: ${filePath}`,
      };
    }

    // Read and parse CSV
    const rows = await readAndParseCSV(filePath);

    if (rows.length < 2) {
      return {
        success: false,
        error: `Invalid weekly target file: insufficient rows`,
      };
    }

    // Row 0: Headers (should be "LABS,KCS")
    const headers = rows[0];
    if (!headers) {
      return {
        success: false,
        error: `Invalid weekly target file: missing header row`,
      };
    }
    const labsColIndex = headers.findIndex((h) => h.toUpperCase() === "LABS");
    const kcsColIndex = headers.findIndex((h) => h.toUpperCase() === "KCS");

    if (labsColIndex === -1 || kcsColIndex === -1) {
      return {
        success: false,
        error: `Invalid headers: expected "LABS" and "KCS" columns`,
      };
    }

    // Parse Labs column (skip row 1 which is "SIS Login ID(")
    const labs: Assessment[] = [];
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const labText = row[labsColIndex]?.trim();
      if (labText && labText !== "" && !labText.includes("SIS Login ID")) {
        const assessment = parseAssessment(labText, "weekly-target");
        if (assessment.type === "Lab") {
          labs.push(assessment);
        }
      }
    }

    // Parse KCs column (skip row 1)
    const kcs: Assessment[] = [];
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const kcText = row[kcsColIndex]?.trim();
      if (kcText && kcText !== "" && !kcText.includes("SIS Login ID")) {
        const assessment = parseAssessment(kcText, "weekly-target");
        if (assessment.type === "KC") {
          kcs.push(assessment);
        }
      }
    }

    return {
      success: true,
      data: {
        week,
        labs,
        kcs,
        totalLabs: labs.length,
        totalKCs: kcs.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse weekly target: ${error}`,
      details: error,
    };
  }
}

/**
 * Parse all weekly target files from week 1 to specified week
 */
export async function parseWeeklyTargets(
  basePath: string,
  currentWeek: WeekNumber,
): Promise<Result<WeeklyTarget[]>> {
  const targets: WeeklyTarget[] = [];
  const errors: string[] = [];

  for (let week = 1; week <= currentWeek; week++) {
    const filePath = `${basePath}/weekly_targets/week_${week}.csv`;
    const result = await parseWeeklyTargetFile(filePath, week as WeekNumber);

    if (result.success) {
      targets.push(result.data);
    } else {
      errors.push(`Week ${week}: ${result.error}`);
    }
  }

  if (errors.length > 0 && targets.length === 0) {
    return {
      success: false,
      error: `Failed to parse any weekly targets`,
      details: errors,
    };
  }

  // Partial success if some files loaded
  if (errors.length > 0) {
    logger.warn(`Some weekly targets failed to load:`, errors);
  }

  return {
    success: true,
    data: targets,
  };
}
