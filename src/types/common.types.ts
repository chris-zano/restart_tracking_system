/**
 * Common types shared across the grading system
 */

/**
 * Result type for operations that can fail
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

/**
 * Student information from class list
 */
export interface Student {
  fullName: string;
  email: string;
  normalizedName: string; // For matching across different sources
}

/**
 * Assessment type - either Knowledge Check or Lab
 */
export type AssessmentType = "KC" | "Lab" | "Activity" | "Unknown";

/**
 * Base assessment information extracted from column/row names
 */
export interface Assessment {
  type: AssessmentType;
  name: string; // Cleaned name without ID
  rawName: string; // Original name from CSV
  canvasId?: string; // ID from Canvas (597705, etc.)
  weeklyTargetId?: string; // ID from weekly targets (352245, etc.)
}

/**
 * Grading status for an assignment
 */
export type GradingStatus = "graded" | "ungraded" | "excluded";

/**
 * Points possible value that determines grading status
 */
export interface PointsPossible {
  value: number;
  status: GradingStatus;
}

/**
 * Score for a single assessment
 */
export interface Score {
  value: number | null; // null if not attempted
  pointsPossible: number;
  percentage: number | null; // null if not attempted
  isComplete: boolean; // Based on threshold (e.g., >= 60%)
  isPerfect: boolean; // 100%
}

/**
 * Configuration settings from settings.json
 */
export interface Config {
  current_week: number;
  completion_threshold?: number; // Default: 60
  attendance_threshold?: number; // Default: 80
}

/**
 * Week number (1-9 for AWS re/Start program)
 */
export type WeekNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Email validation result
 */
export interface EmailValidation {
  isValid: boolean;
  email: string;
  error?: string;
}

/**
 * Generic CSV row (before parsing)
 */
export type RawCSVRow = Record<string, string | number | null>;

/**
 * File metadata
 */
export interface FileMetadata {
  path: string;
  exists: boolean;
  lastModified?: Date;
  size?: number;
}

/**
 * Completion summary
 */
export interface CompletionSummary {
  total: number;
  completed: number;
  percentage: number;
  remaining: number;
}

/**
 * Date range for reporting
 */
export interface DateRange {
  start: Date;
  end: Date;
}
