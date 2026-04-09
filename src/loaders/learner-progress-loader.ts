/**
 * Learner Progress Loader
 * Processes Canvas gradebook data into structured learner progress reports
 */

import {
  findAndParseLearnerProgress,
  getAssessmentsByType,
} from "../parsers/learner-progress-parser";
import { parseClassList } from "../parsers/class-list-parser";
import { readAndParseCSV } from "../utils/file-utils";
import type {
  LearnerProgressReport,
  LearnerProgress,
  AssessmentResult,
  GradebookHeaders,
} from "../types/learner-progress.types";
import type { Student, Result, Score, Assessment } from "../types/common.types";

/**
 * Load complete learner progress report
 */
export async function loadLearnerProgressReport(
  basePath: string,
  completionThreshold: number = 60,
): Promise<Result<LearnerProgressReport>> {
  try {
    // Load class list for student matching
    const classListPath = `${basePath}/class_list/class_list.csv`;
    const classListResult = await parseClassList(classListPath);
    if (!classListResult.success) {
      return {
        success: false,
        error: `Failed to load class list: ${classListResult.error}`,
      };
    }

    const students = classListResult.data;
    const studentsByEmail = new Map<string, Student>();
    students.forEach((s) => studentsByEmail.set(s.email.toLowerCase(), s));

    // Find and parse gradebook file
    const gradebookResult = await findAndParseLearnerProgress(basePath);
    if (!gradebookResult.success) {
      return {
        success: false,
        error: `Failed to load gradebook: ${gradebookResult.error}`,
      };
    }

    const { filePath, context } = gradebookResult.data;
    const { headerRow, assessmentColumns, dataStartRow } = context;

    // Read the CSV file again to get the actual data rows
    const allRows = await readAndParseCSV(filePath);
    const dataRows = allRows.slice(dataStartRow);

    // Build headers structure
    const gradebookHeaders: GradebookHeaders = {
      student: headerRow[0] || "Student",
      id: headerRow[1] || "ID",
      sisUserId: headerRow[2] || "SIS User ID",
      sisLoginId: headerRow[3] || "SIS Login ID",
      section: headerRow[4] || "Section",
      assessmentColumns: assessmentColumns.map((col) => col.columnName),
      summaryColumns: [], // TODO: extract summary column names
    };

    // Parse points possible from row 1
    const pointsPossibleRow: Record<string, number> = {};
    const pointsRow = allRows[1];
    if (pointsRow) {
      assessmentColumns.forEach((col) => {
        const value = pointsRow[col.index];
        if (value) {
          const num = parseFloat(value.toString());
          if (!isNaN(num)) {
            pointsPossibleRow[col.columnName] = num;
          }
        }
      });
    }

    // Process each student row
    const learners: LearnerProgress[] = [];

    for (const row of dataRows) {
      // Build a row object mapping column names to values
      const rowData: Record<string, string | number | null> = {};
      headerRow.forEach((colName, index) => {
        rowData[colName] = row[index] ?? null;
      });

      const email = rowData["SIS Login ID"]?.toString().toLowerCase() || "";
      const matchedStudent = studentsByEmail.get(email);

      if (!matchedStudent) {
        // Skip students not in class list (might be test students or dropped)
        continue;
      }

      const learnerProgress = buildLearnerProgress(
        matchedStudent,
        rowData,
        assessmentColumns,
        completionThreshold,
      );

      learners.push(learnerProgress);
    }

    // Calculate summary statistics
    const summary = calculateSummaryStats(learners, assessmentColumns);

    const report: LearnerProgressReport = {
      headers: gradebookHeaders,
      pointsPossible: pointsPossibleRow,
      learners,
      fileName:
        filePath.split("/").pop() || filePath.split("\\").pop() || filePath,
      summary,
    };

    return {
      success: true,
      data: report,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error loading learner progress report: ${error}`,
    };
  }
}

/**
 * Build a single learner's progress record
 */
function buildLearnerProgress(
  student: Student,
  row: Record<string, string | number | null>,
  assessmentColumns: Array<{
    columnName: string;
    assessment: Assessment;
    pointsPossible: number;
  }>,
  completionThreshold: number,
): LearnerProgress {
  const knowledgeChecks: AssessmentResult[] = [];
  const labs: AssessmentResult[] = [];
  const activities: AssessmentResult[] = [];

  // Process each assessment
  for (const column of assessmentColumns) {
    const rawValue = row[column.columnName];
    const score = parseScore(
      rawValue,
      column.pointsPossible,
      completionThreshold,
    );

    const result: AssessmentResult = {
      assessment: column.assessment,
      score,
    };

    // Categorize by type
    switch (column.assessment.type) {
      case "KC":
        knowledgeChecks.push(result);
        break;
      case "Lab":
        labs.push(result);
        break;
      case "Activity":
        activities.push(result);
        break;
    }
  }

  // Calculate completion counts
  const totalKCsCompleted = knowledgeChecks.filter(
    (kc) => kc.score.isComplete,
  ).length;
  const totalLabsCompleted = labs.filter((lab) => lab.score.isComplete).length;

  // Extract Canvas summary columns (if present)
  const canvasSummary = {
    assignmentsCurrentPoints: parseNumber(row["Assignments Current Points"]),
    assignmentsFinalPoints: parseNumber(row["Assignments Final Points"]),
    assignmentsCurrentScore: parseNumber(row["Assignments Current Score"]),
    knowledgeChecksCurrentPoints: parseNumber(
      row["Knowledge Checks Current Points"],
    ),
    knowledgeChecksFinalPoints: parseNumber(
      row["Knowledge Checks Final Points"],
    ),
    labsCurrentPoints: parseNumber(row["Labs Current Points"]),
    labsFinalPoints: parseNumber(row["Labs Final Points"]),
    currentPoints: parseNumber(row["Current Points"]),
    finalPoints: parseNumber(row["Final Points"]),
    currentScore: parseNumber(row["Current Score"]),
  };

  return {
    student,
    studentId: row["ID"]?.toString() || "",
    sisUserId: row["SIS User ID"]?.toString() || "",
    sisLoginId: row["SIS Login ID"]?.toString() || "",
    section: row["Section"]?.toString() || "",
    knowledgeChecks,
    labs,
    activities,
    totalKCsAvailable: knowledgeChecks.length,
    totalKCsCompleted,
    totalLabsAvailable: labs.length,
    totalLabsCompleted,
    canvasSummary,
  };
}

/**
 * Parse a score value from CSV
 */
function parseScore(
  rawValue: string | number | null | undefined,
  pointsPossible: number,
  completionThreshold: number,
): Score {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return {
      value: null,
      pointsPossible,
      percentage: 0,
      isComplete: false,
      isPerfect: false,
    };
  }

  const value =
    typeof rawValue === "number" ? rawValue : parseFloat(rawValue.toString());

  if (isNaN(value)) {
    return {
      value: null,
      pointsPossible,
      percentage: 0,
      isComplete: false,
      isPerfect: false,
    };
  }

  const percentage = pointsPossible > 0 ? (value / pointsPossible) * 100 : 0;
  const isComplete = percentage >= completionThreshold;
  const isPerfect = percentage === 100;

  return {
    value,
    pointsPossible,
    percentage,
    isComplete,
    isPerfect,
  };
}

/**
 * Parse a number value from CSV (for summary columns)
 */
function parseNumber(
  value: string | number | null | undefined,
): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return isNaN(num) ? undefined : num;
}

/**
 * Calculate summary statistics across all learners
 */
function calculateSummaryStats(
  learners: LearnerProgress[],
  assessmentColumns: Array<{ assessment: Assessment }>,
): LearnerProgressReport["summary"] {
  const totalLearners = learners.length;

  // Count unique assessments
  const uniqueKCs = new Set<string>();
  const uniqueLabs = new Set<string>();
  const uniqueActivities = new Set<string>();

  for (const col of assessmentColumns) {
    const id = col.assessment.canvasId;
    if (!id) continue;
    switch (col.assessment.type) {
      case "KC":
        uniqueKCs.add(id);
        break;
      case "Lab":
        uniqueLabs.add(id);
        break;
      case "Activity":
        uniqueActivities.add(id);
        break;
    }
  }

  // Calculate average completion rates
  let totalKCCompletion = 0;
  let totalLabCompletion = 0;

  for (const learner of learners) {
    const kcRate =
      learner.totalKCsAvailable > 0
        ? (learner.totalKCsCompleted / learner.totalKCsAvailable) * 100
        : 0;
    const labRate =
      learner.totalLabsAvailable > 0
        ? (learner.totalLabsCompleted / learner.totalLabsAvailable) * 100
        : 0;

    totalKCCompletion += kcRate;
    totalLabCompletion += labRate;
  }

  const averageKCCompletion =
    totalLearners > 0 ? totalKCCompletion / totalLearners : 0;
  const averageLabCompletion =
    totalLearners > 0 ? totalLabCompletion / totalLearners : 0;

  return {
    totalLearners,
    totalKCs: uniqueKCs.size,
    totalLabs: uniqueLabs.size,
    totalActivities: uniqueActivities.size,
    averageKCCompletion,
    averageLabCompletion,
  };
}

/**
 * Get learner by email
 */
export function getLearnerByEmail(
  report: LearnerProgressReport,
  email: string,
): LearnerProgress | undefined {
  return report.learners.find(
    (l) => l.student.email.toLowerCase() === email.toLowerCase(),
  );
}

/**
 * Get learners sorted by completion rate
 */
export function getLearnersSortedByCompletion(
  report: LearnerProgressReport,
  assessmentType: "KC" | "Lab" = "KC",
): LearnerProgress[] {
  return [...report.learners].sort((a, b) => {
    const aRate =
      assessmentType === "KC"
        ? a.totalKCsAvailable > 0
          ? a.totalKCsCompleted / a.totalKCsAvailable
          : 0
        : a.totalLabsAvailable > 0
          ? a.totalLabsCompleted / a.totalLabsAvailable
          : 0;

    const bRate =
      assessmentType === "KC"
        ? b.totalKCsAvailable > 0
          ? b.totalKCsCompleted / b.totalKCsAvailable
          : 0
        : b.totalLabsAvailable > 0
          ? b.totalLabsCompleted / b.totalLabsAvailable
          : 0;

    return bRate - aRate; // Descending order
  });
}
