/**
 * Types for learner progress reports (Canvas gradebook export)
 */

import type { Assessment, Score, Student } from "./common.types";

/**
 * Raw CSV header structure from Canvas gradebook
 */
export interface GradebookHeaders {
  student: string; // "Student"
  id: string; // "ID"
  sisUserId: string; // "SIS User ID"
  sisLoginId: string; // "SIS Login ID"
  section: string; // "Section"
  assessmentColumns: string[]; // All KC/Lab column names
  summaryColumns: string[]; // "Assignments Current Points", etc.
}

/**
 * Points Possible row (row 2 in CSV)
 */
export interface PointsPossibleRow {
  [columnName: string]: number; // 100.00, 1.00, 0.00, etc.
}

/**
 * Single assessment result for a student
 */
export interface AssessmentResult {
  assessment: Assessment;
  score: Score;
}

/**
 * Learner's complete progress data
 */
export interface LearnerProgress {
  student: Student;
  studentId: string; // Canvas ID
  sisUserId: string; // SIS User ID
  sisLoginId: string; // Email (login)
  section: string; // GHACC63

  // Assessment results grouped by type
  knowledgeChecks: AssessmentResult[];
  labs: AssessmentResult[];
  activities: AssessmentResult[];

  // Summary statistics (calculated)
  totalKCsAvailable: number;
  totalKCsCompleted: number;
  totalLabsAvailable: number;
  totalLabsCompleted: number;

  // Raw summary from Canvas (last columns)
  canvasSummary: {
    assignmentsCurrentPoints?: number;
    assignmentsFinalPoints?: number;
    assignmentsCurrentScore?: number;
    knowledgeChecksCurrentPoints?: number;
    knowledgeChecksFinalPoints?: number;
    labsCurrentPoints?: number;
    labsFinalPoints?: number;
    currentPoints?: number;
    finalPoints?: number;
    currentScore?: number;
  };
}

/**
 * Complete gradebook report
 */
export interface LearnerProgressReport {
  headers: GradebookHeaders;
  pointsPossible: PointsPossibleRow;
  learners: LearnerProgress[];

  // Metadata
  reportDate?: Date;
  fileName: string;

  // Summary stats across all learners
  summary: {
    totalLearners: number;
    totalKCs: number;
    totalLabs: number;
    totalActivities: number;
    averageKCCompletion: number;
    averageLabCompletion: number;
  };
}

/**
 * Column classification result
 */
export interface ColumnClassification {
  columnName: string;
  index: number;
  assessment: Assessment;
  pointsPossible: number;
  isGraded: boolean;
  isIncluded: boolean; // false for excluded columns
}

/**
 * Gradebook parsing context
 */
export interface GradebookParseContext {
  totalRows: number;
  headerRow: string[];
  pointsPossibleRow: (string | number | null)[];
  dataStartRow: number; // Usually row 3 (0-indexed: 2)
  assessmentColumns: ColumnClassification[];
}
