/**
 * Analysis Engine - Compare learner progress against targets
 */

import type { IntegratedData } from "../types/orchestrator.types";
import type {
  LearnerWeeklyProgress,
  LearnerCumulativeProgress,
  TargetComparisonReport,
} from "../types/weekly-targets.types";
import type {
  Assessment,
  CompletionSummary,
  WeekNumber,
} from "../types/common.types";
import type { LearnerProgress } from "../types/learner-progress.types";

/**
 * Generate complete target comparison report for all learners
 */
export function analyzeTargetCompletion(
  data: IntegratedData,
): TargetComparisonReport {
  const { students, targets, progress } = data;

  // Build learner progress map for quick lookup
  const progressMap = new Map<string, LearnerProgress>();
  progress.learners.forEach((lp) => {
    progressMap.set(lp.student.email.toLowerCase(), lp);
  });

  // Analyze each learner
  const learnerProgress: LearnerCumulativeProgress[] = [];

  for (const student of students) {
    const learnerProgressData = progressMap.get(student.email.toLowerCase());

    if (!learnerProgressData) {
      // Student not in gradebook - create empty progress
      learnerProgress.push(createEmptyProgress(student, data.currentWeek));
      continue;
    }

    const cumulativeProgress = analyzeLearnerProgress(
      student,
      learnerProgressData,
      targets,
      data.currentWeek,
    );

    learnerProgress.push(cumulativeProgress);
  }

  // Calculate class-wide statistics
  const classStats = calculateClassStats(learnerProgress);

  return {
    currentWeek: data.currentWeek as WeekNumber,
    reportDate: new Date(),
    learnerProgress,
    classStats,
  };
}

/**
 * Analyze a single learner's progress against targets
 */
function analyzeLearnerProgress(
  student: any,
  learnerProgress: LearnerProgress,
  targets: any,
  currentWeek: number,
): LearnerCumulativeProgress {
  const weeklyProgress: LearnerWeeklyProgress[] = [];

  // Build completed assessments map
  const completedKCs = new Set<string>();
  const completedLabs = new Set<string>();

  learnerProgress.knowledgeChecks.forEach((kc) => {
    if (kc.score.isComplete) {
      if (kc.assessment.canvasId) {
        completedKCs.add(kc.assessment.canvasId);
      }
      completedKCs.add(kc.assessment.name);
    }
  });

  learnerProgress.labs.forEach((lab) => {
    if (lab.score.isComplete) {
      if (lab.assessment.canvasId) {
        completedLabs.add(lab.assessment.canvasId);
      }
      completedLabs.add(lab.assessment.name);
    }
  });

  // Analyze week by week
  for (const weekTarget of targets.weeks) {
    // Check KC completion for this week
    const expectedKCs = weekTarget.kcs;
    const completedWeekKCs: Assessment[] = [];
    const missingWeekKCs: Assessment[] = [];

    for (const kc of expectedKCs) {
      const isCompleted =
        (kc.canvasId && completedKCs.has(kc.canvasId)) ||
        completedKCs.has(kc.name) ||
        (kc.weeklyTargetId && completedKCs.has(kc.weeklyTargetId));

      if (isCompleted) {
        completedWeekKCs.push(kc);
      } else {
        missingWeekKCs.push(kc);
      }
    }

    // Check Lab completion for this week
    const expectedLabs = weekTarget.labs;
    const completedWeekLabs: Assessment[] = [];
    const missingWeekLabs: Assessment[] = [];

    for (const lab of expectedLabs) {
      const isCompleted =
        (lab.canvasId && completedLabs.has(lab.canvasId)) ||
        completedLabs.has(lab.name) ||
        (lab.weeklyTargetId && completedLabs.has(lab.weeklyTargetId));

      if (isCompleted) {
        completedWeekLabs.push(lab);
      } else {
        missingWeekLabs.push(lab);
      }
    }

    // Calculate summaries
    const kcSummary: CompletionSummary = {
      completed: completedWeekKCs.length,
      total: expectedKCs.length,
      percentage:
        expectedKCs.length > 0
          ? (completedWeekKCs.length / expectedKCs.length) * 100
          : 0,
      remaining: expectedKCs.length - completedWeekKCs.length,
    };

    const labSummary: CompletionSummary = {
      completed: completedWeekLabs.length,
      total: expectedLabs.length,
      percentage:
        expectedLabs.length > 0
          ? (completedWeekLabs.length / expectedLabs.length) * 100
          : 0,
      remaining: expectedLabs.length - completedWeekLabs.length,
    };

    const overallCompletion =
      ((completedWeekKCs.length + completedWeekLabs.length) /
        (expectedKCs.length + expectedLabs.length)) *
      100;

    weeklyProgress.push({
      week: weekTarget.week,
      learnerEmail: student.email,
      learnerName: student.fullName,
      kcs: {
        expected: expectedKCs,
        completed: completedWeekKCs,
        missing: missingWeekKCs,
        summary: kcSummary,
      },
      labs: {
        expected: expectedLabs,
        completed: completedWeekLabs,
        missing: missingWeekLabs,
        summary: labSummary,
      },
      overallCompletion,
    });
  }

  // Calculate cumulative summary from weekly progress
  // Sum up all completed targets across all weeks
  let cumulativeKCsCompleted = 0;
  let cumulativeLabsCompleted = 0;

  for (const week of weeklyProgress) {
    cumulativeKCsCompleted += week.kcs.summary.completed;
    cumulativeLabsCompleted += week.labs.summary.completed;
  }

  const totalKCsExpected = targets.totalKCs;
  const totalLabsExpected = targets.totalLabs;

  const cumulativeKCs: CompletionSummary = {
    completed: cumulativeKCsCompleted,
    total: totalKCsExpected,
    percentage:
      totalKCsExpected > 0
        ? (cumulativeKCsCompleted / totalKCsExpected) * 100
        : 0,
    remaining: totalKCsExpected - cumulativeKCsCompleted,
  };

  const cumulativeLabs: CompletionSummary = {
    completed: cumulativeLabsCompleted,
    total: totalLabsExpected,
    percentage:
      totalLabsExpected > 0
        ? (cumulativeLabsCompleted / totalLabsExpected) * 100
        : 0,
    remaining: totalLabsExpected - cumulativeLabsCompleted,
  };

  const overallTotal = totalKCsExpected + totalLabsExpected;
  const overallCompleted = cumulativeKCsCompleted + cumulativeLabsCompleted;
  const cumulativeOverall: CompletionSummary = {
    completed: overallCompleted,
    total: overallTotal,
    percentage: overallTotal > 0 ? (overallCompleted / overallTotal) * 100 : 0,
    remaining: overallTotal - overallCompleted,
  };

  // Collect all missing assessments
  const missingKCs: Assessment[] = [];
  const missingLabs: Assessment[] = [];

  for (const week of weeklyProgress) {
    missingKCs.push(...week.kcs.missing);
    missingLabs.push(...week.labs.missing);
  }

  return {
    learnerEmail: student.email,
    learnerName: student.fullName,
    currentWeek: currentWeek as WeekNumber,
    weeklyProgress,
    cumulative: {
      kcs: cumulativeKCs,
      labs: cumulativeLabs,
      overall: cumulativeOverall,
    },
    missingKCs,
    missingLabs,
  };
}

/**
 * Create empty progress for a student not in gradebook
 */
function createEmptyProgress(
  student: any,
  currentWeek: number,
): LearnerCumulativeProgress {
  return {
    learnerEmail: student.email,
    learnerName: student.fullName,
    currentWeek: currentWeek as WeekNumber,
    weeklyProgress: [],
    cumulative: {
      kcs: { completed: 0, total: 0, percentage: 0, remaining: 0 },
      labs: { completed: 0, total: 0, percentage: 0, remaining: 0 },
      overall: { completed: 0, total: 0, percentage: 0, remaining: 0 },
    },
    missingKCs: [],
    missingLabs: [],
  };
}

/**
 * Calculate class-wide statistics
 */
function calculateClassStats(
  learnerProgress: LearnerCumulativeProgress[],
): TargetComparisonReport["classStats"] {
  const totalLearners = learnerProgress.length;

  if (totalLearners === 0) {
    return {
      totalLearners: 0,
      averageKCCompletion: 0,
      averageLabCompletion: 0,
      averageOverallCompletion: 0,
      learnersAhead: 0,
      learnersOnTrack: 0,
      learnersBehind: 0,
      learnersAtRisk: 0,
    };
  }

  // Calculate averages
  let totalKCCompletion = 0;
  let totalLabCompletion = 0;
  let totalOverallCompletion = 0;

  let learnersAhead = 0;
  let learnersOnTrack = 0;
  let learnersBehind = 0;
  let learnersAtRisk = 0;

  for (const learner of learnerProgress) {
    totalKCCompletion += learner.cumulative.kcs.percentage;
    totalLabCompletion += learner.cumulative.labs.percentage;
    totalOverallCompletion += learner.cumulative.overall.percentage;

    const completion = learner.cumulative.overall.percentage;
    if (completion >= 90) {
      learnersAhead++;
    } else if (completion >= 70) {
      learnersOnTrack++;
    } else if (completion >= 50) {
      learnersBehind++;
    } else {
      learnersAtRisk++;
    }
  }

  return {
    totalLearners,
    averageKCCompletion: totalKCCompletion / totalLearners,
    averageLabCompletion: totalLabCompletion / totalLearners,
    averageOverallCompletion: totalOverallCompletion / totalLearners,
    learnersAhead,
    learnersOnTrack,
    learnersBehind,
    learnersAtRisk,
  };
}

/**
 * Get learners needing attention (below threshold)
 */
export function getLearnersNeedingAttention(
  report: TargetComparisonReport,
  threshold: number = 50,
): LearnerCumulativeProgress[] {
  return report.learnerProgress.filter(
    (lp) => lp.cumulative.overall.percentage < threshold,
  );
}

/**
 * Get top performers
 */
export function getTopPerformers(
  report: TargetComparisonReport,
  count: number = 10,
): LearnerCumulativeProgress[] {
  return [...report.learnerProgress]
    .sort(
      (a, b) =>
        b.cumulative.overall.percentage - a.cumulative.overall.percentage,
    )
    .slice(0, count);
}

/**
 * Export report to JSON
 */
export function exportReportToJSON(report: TargetComparisonReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Generate summary text for a learner
 */
export function generateLearnerSummary(
  learner: LearnerCumulativeProgress,
): string {
  const lines: string[] = [];

  lines.push(`Learner: ${learner.learnerName}`);
  lines.push(`Email: ${learner.learnerEmail}`);
  lines.push(`Current Week: ${learner.currentWeek}`);
  lines.push("");

  lines.push("Cumulative Progress:");
  lines.push(
    `  KCs: ${learner.cumulative.kcs.completed}/${learner.cumulative.kcs.total} (${learner.cumulative.kcs.percentage.toFixed(1)}%)`,
  );
  lines.push(
    `  Labs: ${learner.cumulative.labs.completed}/${learner.cumulative.labs.total} (${learner.cumulative.labs.percentage.toFixed(1)}%)`,
  );
  lines.push(
    `  Overall: ${learner.cumulative.overall.completed}/${learner.cumulative.overall.total} (${learner.cumulative.overall.percentage.toFixed(1)}%)`,
  );
  lines.push("");

  lines.push("Week-by-Week Progress:");
  for (const week of learner.weeklyProgress) {
    lines.push(
      `  Week ${week.week}: ${week.kcs.summary.completed}/${week.kcs.summary.total} KCs, ${week.labs.summary.completed}/${week.labs.summary.total} Labs (${week.overallCompletion.toFixed(1)}%)`,
    );
  }

  if (learner.missingKCs.length > 0) {
    lines.push("");
    lines.push(`Missing KCs (${learner.missingKCs.length}):`);
    learner.missingKCs.slice(0, 10).forEach((kc) => {
      lines.push(`  - ${kc.name}`);
    });
    if (learner.missingKCs.length > 10) {
      lines.push(`  ... and ${learner.missingKCs.length - 10} more`);
    }
  }

  if (learner.missingLabs.length > 0) {
    lines.push("");
    lines.push(`Missing Labs (${learner.missingLabs.length}):`);
    learner.missingLabs.slice(0, 10).forEach((lab) => {
      lines.push(`  - ${lab.name}`);
    });
    if (learner.missingLabs.length > 10) {
      lines.push(`  ... and ${learner.missingLabs.length - 10} more`);
    }
  }

  return lines.join("\n");
}
