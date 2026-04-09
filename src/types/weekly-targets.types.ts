/**
 * Types for weekly target data
 */

import type { Assessment, WeekNumber, CompletionSummary } from "./common.types";

/**
 * Single week's target structure
 */
export interface WeeklyTarget {
  week: WeekNumber;
  kcs: Assessment[];
  labs: Assessment[];

  // Counts
  totalKCs: number;
  totalLabs: number;
}

/**
 * Cumulative targets from week 1 to current week
 */
export interface CumulativeTargets {
  currentWeek: WeekNumber;
  weeks: WeeklyTarget[];

  // Aggregated lists
  allKCs: Assessment[];
  allLabs: Assessment[];

  // Counts
  totalKCs: number;
  totalLabs: number;

  // Per-week breakdown
  perWeek: Record<WeekNumber, WeeklyTarget>;
}

/**
 * Raw weekly target CSV structure
 */
export interface WeeklyTargetCSV {
  LABS: string[];
  KCS: string[];
}

/**
 * Learner's progress against weekly targets
 */
export interface LearnerWeeklyProgress {
  week: WeekNumber;
  learnerEmail: string;
  learnerName: string;

  // KC progress
  kcs: {
    expected: Assessment[];
    completed: Assessment[];
    missing: Assessment[];
    summary: CompletionSummary;
  };

  // Lab progress
  labs: {
    expected: Assessment[];
    completed: Assessment[];
    missing: Assessment[];
    summary: CompletionSummary;
  };

  // Overall
  overallCompletion: number; // Percentage
}

/**
 * Learner's cumulative progress against all targets
 */
export interface LearnerCumulativeProgress {
  learnerEmail: string;
  learnerName: string;
  currentWeek: WeekNumber;

  // Week-by-week breakdown
  weeklyProgress: LearnerWeeklyProgress[];

  // Cumulative summary
  cumulative: {
    kcs: CompletionSummary;
    labs: CompletionSummary;
    overall: CompletionSummary;
  };

  // Missing assessments across all weeks
  missingKCs: Assessment[];
  missingLabs: Assessment[];
}

/**
 * Comparison result between targets and actual progress
 */
export interface TargetComparisonReport {
  currentWeek: WeekNumber;
  reportDate: Date;

  // Per-learner analysis
  learnerProgress: LearnerCumulativeProgress[];

  // Class-wide statistics
  classStats: {
    totalLearners: number;
    averageKCCompletion: number;
    averageLabCompletion: number;
    averageOverallCompletion: number;

    // Distribution
    learnersAhead: number; // >90% completion
    learnersOnTrack: number; // 70-90%
    learnersBehind: number; // 50-70%
    learnersAtRisk: number; // <50%
  };
}
