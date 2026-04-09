/**
 * Parser for Canvas learner progress reports (gradebook export)
 */

import {
  readAndParseCSV,
  fileExists,
  findMostRecentFile,
} from "../utils/file-utils";
import { parseAssessment } from "../utils/assessment-name-extractor";
import type { Result, Assessment } from "../types/common.types";
import type {
  GradebookHeaders,
  PointsPossibleRow,
  ColumnClassification,
  GradebookParseContext,
} from "../types/learner-progress.types";

/**
 * Parse the header row to identify column structure
 */
function parseHeaders(headerRow: string[]): GradebookHeaders {
  const assessmentColumns: string[] = [];
  const summaryColumns: string[] = [];

  for (let i = 5; i < headerRow.length; i++) {
    const col = headerRow[i];
    if (!col) continue;

    // Summary columns contain "Current" or "Final" or are marked as "(read only)"
    if (
      col.includes("Current Points") ||
      col.includes("Final Points") ||
      col.includes("Current Score") ||
      col.includes("Final Score") ||
      col.includes("(read only)")
    ) {
      summaryColumns.push(col);
    } else {
      assessmentColumns.push(col);
    }
  }

  return {
    student: headerRow[0] || "Student",
    id: headerRow[1] || "ID",
    sisUserId: headerRow[2] || "SIS User ID",
    sisLoginId: headerRow[3] || "SIS Login ID",
    section: headerRow[4] || "Section",
    assessmentColumns,
    summaryColumns,
  };
}

/**
 * Parse the Points Possible row (row 2)
 */
function parsePointsPossible(row: string[]): PointsPossibleRow {
  const pointsPossible: PointsPossibleRow = {};

  // Start from column 5 (after Student, ID, SIS User ID, SIS Login ID, Section)
  for (let i = 5; i < row.length; i++) {
    const value = row[i]?.trim();
    if (value && value !== "") {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        pointsPossible[`col_${i}`] = num;
      }
    }
  }

  return pointsPossible;
}

/**
 * Classify columns as KC, Lab, Activity based on headers and points possible
 */
function classifyColumns(
  headerRow: string[],
  pointsPossibleRow: string[],
): ColumnClassification[] {
  const classifications: ColumnClassification[] = [];

  for (let i = 5; i < headerRow.length; i++) {
    const columnName = headerRow[i];
    const pointsText = pointsPossibleRow[i]?.trim();

    // Skip if no column name
    if (!columnName || columnName.trim() === "") continue;

    // Skip summary columns
    if (
      columnName.includes("Current Points") ||
      columnName.includes("Final Points") ||
      columnName.includes("(read only)")
    ) {
      continue;
    }

    const pointsPossible = parseFloat(pointsText || "0");

    // Determine if graded
    let isGraded = false;
    let isIncluded = true;

    if (pointsPossible === 100) {
      isGraded = true;
    } else if (pointsPossible === 1) {
      isGraded = false; // Ungraded activity
    } else if (pointsPossible === 0) {
      isIncluded = false; // Excluded
    }

    // Parse assessment details
    const assessment = parseAssessment(columnName, "canvas");

    classifications.push({
      columnName,
      index: i,
      assessment,
      pointsPossible,
      isGraded,
      isIncluded,
    });
  }

  return classifications;
}

/**
 * Parse the learner progress CSV file
 */
export async function parseLearnerProgressFile(
  filePath: string,
): Promise<Result<GradebookParseContext>> {
  try {
    const exists = await fileExists(filePath);
    if (!exists) {
      return {
        success: false,
        error: `Learner progress file not found: ${filePath}`,
      };
    }

    const rows = await readAndParseCSV(filePath);

    if (rows.length < 3) {
      return {
        success: false,
        error: `Invalid learner progress file: insufficient rows (need at least 3)`,
      };
    }

    // Row 0: Headers
    const headerRow = rows[0];
    if (!headerRow) {
      return {
        success: false,
        error: `Invalid gradebook: missing header row`,
      };
    }
    const headers = parseHeaders(headerRow);

    // Row 1: Points Possible
    const pointsPossibleRow = rows[1];
    if (!pointsPossibleRow) {
      return {
        success: false,
        error: `Invalid gradebook: missing points possible row`,
      };
    }
    const pointsPossible = parsePointsPossible(pointsPossibleRow);

    // Classify columns
    const assessmentColumns = classifyColumns(headerRow, pointsPossibleRow);

    // Row 2+: Student data
    const dataStartRow = 2;

    const context: GradebookParseContext = {
      totalRows: rows.length,
      headerRow,
      pointsPossibleRow,
      dataStartRow,
      assessmentColumns,
    };

    return {
      success: true,
      data: context,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse learner progress file: ${error}`,
      details: error,
    };
  }
}

/**
 * Find and parse the most recent learner progress report
 */
export async function findAndParseLearnerProgress(
  basePath: string,
): Promise<Result<{ filePath: string; context: GradebookParseContext }>> {
  try {
    const progressDir = `${basePath}/learner_progess_reports`;

    // Find the most recent CSV file
    const filePath = await findMostRecentFile(progressDir, /\.csv$/i);

    if (!filePath) {
      return {
        success: false,
        error: `No learner progress CSV file found in ${progressDir}`,
      };
    }

    const result = await parseLearnerProgressFile(filePath);

    if (!result.success) {
      return result as any;
    }

    return {
      success: true,
      data: {
        filePath,
        context: result.data,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to find learner progress file: ${error}`,
      details: error,
    };
  }
}

/**
 * Get assessment columns by type
 */
export function getAssessmentsByType(classifications: ColumnClassification[]) {
  return {
    kcs: classifications.filter(
      (c) => c.assessment.type === "KC" && c.isIncluded,
    ),
    labs: classifications.filter(
      (c) => c.assessment.type === "Lab" && c.isIncluded,
    ),
    activities: classifications.filter(
      (c) => c.assessment.type === "Activity" && c.isIncluded,
    ),
    graded: classifications.filter((c) => c.isGraded),
    ungraded: classifications.filter((c) => !c.isGraded && c.isIncluded),
  };
}
