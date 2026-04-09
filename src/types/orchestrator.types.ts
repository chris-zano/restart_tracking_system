/**
 * Types for the data orchestrator
 */

import type { Student } from "./common.types";
import type { CumulativeTargets } from "./weekly-targets.types";
import type { AttendanceReport } from "./attendance.types";
import type { LearnerProgressReport } from "./learner-progress.types";

/**
 * Complete integrated dataset
 */
export interface IntegratedData {
  // Source data
  students: Student[];
  targets: CumulativeTargets;
  attendance: AttendanceReport;
  progress: LearnerProgressReport;

  // Metadata
  loadedAt: Date;
  basePath: string;
  currentWeek: number;
  completionThreshold: number;
  attendanceThreshold: number;

  // Validation results
  validation: ValidationReport;
}

/**
 * Data validation report
 */
export interface ValidationReport {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];

  // Cross-reference checks
  checks: {
    studentsInClassList: number;
    studentsInGradebook: number;
    studentsInAttendance: number;
    matchRate: number; // Percentage of students matched across all sources

    targetsVsGradebook: {
      targetsInGradebook: number;
      targetsMissing: number;
      extraAssessments: number;
    };
  };
}

/**
 * Validation error (critical issues)
 */
export interface ValidationError {
  type: "missing_data" | "data_mismatch" | "invalid_format";
  severity: "critical" | "error";
  message: string;
  details?: unknown;
}

/**
 * Validation warning (non-critical issues)
 */
export interface ValidationWarning {
  type: "partial_data" | "low_match_rate" | "missing_students" | "extra_data";
  message: string;
  affectedItems?: string[];
  details?: unknown;
}

/**
 * Data loading options
 */
export interface DataLoadOptions {
  basePath?: string;
  currentWeek?: number;
  completionThreshold?: number;

  // Optional overrides
  allowPartialData?: boolean; // Continue even if some data sources fail
  skipValidation?: boolean; // Skip cross-validation checks

  // Specific data sources to load
  loadTargets?: boolean;
  loadAttendance?: boolean;
  loadProgress?: boolean;
}

/**
 * Data loading result
 */
export interface DataLoadResult {
  success: boolean;
  data?: IntegratedData;
  error?: string;
  partialData?: Partial<IntegratedData>;
  failedSources?: string[];
}
