/**
 * Data Orchestrator - Main data ingestion pipeline
 */

import { loadConfig } from "../config/settings";
import { getStudentsFromIndex } from "../parsers/class-list-parser";
import { loadCumulativeTargets } from "../loaders/weekly-targets-loader";
import { loadAttendanceReport } from "../loaders/attendance-loader";
import { loadLearnerProgressReport } from "../loaders/learner-progress-loader";
import { logger } from "../utils/logger";
import type {
  IntegratedData,
  DataLoadOptions,
  DataLoadResult,
  ValidationReport,
  ValidationError,
  ValidationWarning,
} from "../types/orchestrator.types";
import type { Student, WeekNumber } from "../types/common.types";
import type { CumulativeTargets } from "../types/weekly-targets.types";
import type { AttendanceReport } from "../types/attendance.types";
import type { LearnerProgressReport } from "../types/learner-progress.types";

/**
 * Load all data sources and combine into integrated dataset
 */
export async function ingestAllData(
  options: DataLoadOptions = {},
): Promise<DataLoadResult> {
  const {
    basePath = ".",
    allowPartialData = false,
    skipValidation = false,
    loadTargets = true,
    loadAttendance = true,
    loadProgress = true,
  } = options;

  try {
    // Load configuration
    const config = await loadConfig(basePath);
    const currentWeek = options.currentWeek ?? config.current_week;
    const completionThreshold =
      options.completionThreshold ?? config.completion_threshold;
    const attendanceThreshold = config.attendance_threshold ?? 80;

    logger.info(
      `Loading data for week ${currentWeek}, threshold ${completionThreshold}%`,
    );

    // Track failed sources
    const failedSources: string[] = [];
    const partialData: Partial<IntegratedData> = {};

    // Load class list from canonical learner index (single source of truth)
    logger.info("Loading class list from learner index...");
    const students = getStudentsFromIndex();
    partialData.students = students;
    logger.success(`Loaded ${students.length} students from learner index`);

    // Load weekly targets
    let targets: CumulativeTargets | undefined;
    if (loadTargets) {
      logger.info("Loading weekly targets...");
      const targetsResult = await loadCumulativeTargets(
        basePath,
        currentWeek as WeekNumber,
      );

      if (!targetsResult.success) {
        failedSources.push("weekly_targets");
        if (!allowPartialData) {
          return {
            success: false,
            error: `Failed to load targets: ${targetsResult.error}`,
            failedSources,
            partialData,
          };
        }
        logger.warn(`Targets failed: ${targetsResult.error}`);
      } else {
        targets = targetsResult.data;
        partialData.targets = targets;
        logger.success(
          `Loaded ${targets.totalKCs} KCs, ${targets.totalLabs} Labs`,
        );
      }
    }

    // Load attendance
    let attendance: AttendanceReport | undefined;
    if (loadAttendance) {
      logger.info("Loading attendance...");
      const attendanceResult = await loadAttendanceReport(basePath);

      if (!attendanceResult.success) {
        failedSources.push("attendance");
        if (!allowPartialData) {
          return {
            success: false,
            error: `Failed to load attendance: ${attendanceResult.error}`,
            failedSources,
            partialData,
          };
        }
        logger.warn(`Attendance failed: ${attendanceResult.error}`);
      } else {
        attendance = attendanceResult.data;
        partialData.attendance = attendance;
        logger.success(
          `Loaded ${attendance.stats.totalSessions} sessions, ${attendance.learnerAttendance.length} learners`,
        );
      }
    }

    // Load learner progress
    let progress: LearnerProgressReport | undefined;
    if (loadProgress) {
      logger.info("Loading learner progress...");
      const progressResult = await loadLearnerProgressReport(
        basePath,
        completionThreshold,
      );

      if (!progressResult.success) {
        failedSources.push("learner_progress");
        if (!allowPartialData) {
          return {
            success: false,
            error: `Failed to load progress: ${progressResult.error}`,
            failedSources,
            partialData,
          };
        }
        logger.warn(`Progress failed: ${progressResult.error}`);
      } else {
        progress = progressResult.data;
        partialData.progress = progress;
        logger.success(
          `Loaded ${progress.summary.totalLearners} learners, ${progress.summary.totalKCs} KCs`,
        );
      }
    }

    // Check if we tried to load sources but all failed
    const requestedAny = loadTargets || loadAttendance || loadProgress;
    const loadedAny = targets || attendance || progress;

    if (requestedAny && !loadedAny) {
      return {
        success: false,
        error: "No data sources loaded successfully",
        failedSources,
        partialData,
      };
    }

    // Perform validation
    let validation: ValidationReport;
    if (skipValidation) {
      validation = createEmptyValidation();
    } else {
      logger.info("Validating data...");
      validation = validateData(students, targets, attendance, progress);

      if (validation.errors.length > 0) {
        logger.error(`${validation.errors.length} validation errors`);
        validation.errors.forEach((err) => logger.error(`  - ${err.message}`));
      }

      if (validation.warnings.length > 0) {
        logger.warn(`${validation.warnings.length} validation warnings`);
      }

      if (!validation.isValid && !allowPartialData) {
        return {
          success: false,
          error: "Data validation failed",
          failedSources,
          partialData,
        };
      }
    }

    // Create integrated dataset
    const integratedData: IntegratedData = {
      students,
      targets: targets!,
      attendance: attendance!,
      progress: progress!,
      loadedAt: new Date(),
      basePath,
      currentWeek,
      completionThreshold: completionThreshold || 60,
      attendanceThreshold,
      validation,
    };

    logger.success("Data integration complete");

    return {
      success: true,
      data: integratedData,
      failedSources: failedSources.length > 0 ? failedSources : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error during data ingestion: ${error}`,
    };
  }
}

/**
 * Validate data consistency across sources
 */
function validateData(
  students: Student[],
  targets?: CumulativeTargets,
  attendance?: AttendanceReport,
  progress?: LearnerProgressReport,
): ValidationReport {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Student count checks
  const studentsInClassList = students.length;
  const studentsInGradebook = progress?.learners.length ?? 0;
  const studentsInAttendance = attendance?.learnerAttendance.length ?? 0;

  // Check if class list is empty
  if (studentsInClassList === 0) {
    errors.push({
      type: "missing_data",
      severity: "critical",
      message: "Class list is empty",
    });
  }

  // Check student count mismatches
  if (progress && studentsInGradebook < studentsInClassList * 0.8) {
    warnings.push({
      type: "missing_students",
      message: `Only ${studentsInGradebook}/${studentsInClassList} students found in gradebook`,
    });
  }

  if (attendance && studentsInAttendance < studentsInClassList * 0.8) {
    warnings.push({
      type: "missing_students",
      message: `Only ${studentsInAttendance}/${studentsInClassList} students tracked in attendance`,
    });
  }

  // Calculate match rate
  const matchRate = calculateMatchRate(
    studentsInClassList,
    studentsInGradebook,
    studentsInAttendance,
  );

  if (matchRate < 80 && (progress || attendance)) {
    warnings.push({
      type: "low_match_rate",
      message: `Low student match rate: ${matchRate.toFixed(1)}%`,
    });
  }

  // Cross-reference targets vs gradebook
  let targetsVsGradebook = {
    targetsInGradebook: 0,
    targetsMissing: 0,
    extraAssessments: 0,
  };

  if (targets && progress) {
    targetsVsGradebook = validateTargetsVsGradebook(targets, progress);

    if (targetsVsGradebook.targetsMissing > 0) {
      warnings.push({
        type: "partial_data",
        message: `${targetsVsGradebook.targetsMissing} target assessments not found in gradebook`,
      });
    }
  }

  // Check for unmatched attendance
  if (attendance && attendance.unmatchedAttendees.length > 0) {
    warnings.push({
      type: "partial_data",
      message: `${attendance.unmatchedAttendees.length} unmatched attendees in attendance records`,
      affectedItems: attendance.unmatchedAttendees
        .slice(0, 5)
        .map((a) => a.name),
    });
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    checks: {
      studentsInClassList,
      studentsInGradebook,
      studentsInAttendance,
      matchRate,
      targetsVsGradebook,
    },
  };
}

/**
 * Calculate overall student match rate
 */
function calculateMatchRate(
  classListCount: number,
  gradebookCount: number,
  attendanceCount: number,
): number {
  if (classListCount === 0) return 0;

  const sources = [gradebookCount, attendanceCount].filter((c) => c > 0);
  if (sources.length === 0) return 0;

  const avgFound = sources.reduce((sum, c) => sum + c, 0) / sources.length;
  return (avgFound / classListCount) * 100;
}

/**
 * Validate targets against gradebook
 */
function validateTargetsVsGradebook(
  targets: CumulativeTargets,
  progress: LearnerProgressReport,
): {
  targetsInGradebook: number;
  targetsMissing: number;
  extraAssessments: number;
} {
  // Get all assessments from gradebook
  const gradebookAssessments = new Set<string>();

  for (const learner of progress.learners) {
    learner.knowledgeChecks.forEach((kc) => {
      if (kc.assessment.canvasId) {
        gradebookAssessments.add(kc.assessment.canvasId);
      }
      gradebookAssessments.add(kc.assessment.name);
    });

    learner.labs.forEach((lab) => {
      if (lab.assessment.canvasId) {
        gradebookAssessments.add(lab.assessment.canvasId);
      }
      gradebookAssessments.add(lab.assessment.name);
    });
  }

  // Check how many targets are in gradebook
  let targetsInGradebook = 0;
  let targetsMissing = 0;

  for (const kc of targets.allKCs) {
    const found =
      (kc.canvasId && gradebookAssessments.has(kc.canvasId)) ||
      gradebookAssessments.has(kc.name);
    if (found) {
      targetsInGradebook++;
    } else {
      targetsMissing++;
    }
  }

  for (const lab of targets.allLabs) {
    const found =
      (lab.canvasId && gradebookAssessments.has(lab.canvasId)) ||
      gradebookAssessments.has(lab.name);
    if (found) {
      targetsInGradebook++;
    } else {
      targetsMissing++;
    }
  }

  const extraAssessments = gradebookAssessments.size - targetsInGradebook;

  return {
    targetsInGradebook,
    targetsMissing,
    extraAssessments,
  };
}

/**
 * Create empty validation report
 */
function createEmptyValidation(): ValidationReport {
  return {
    isValid: true,
    errors: [],
    warnings: [],
    checks: {
      studentsInClassList: 0,
      studentsInGradebook: 0,
      studentsInAttendance: 0,
      matchRate: 0,
      targetsVsGradebook: {
        targetsInGradebook: 0,
        targetsMissing: 0,
        extraAssessments: 0,
      },
    },
  };
}
