/**
 * Test suite for Phase 3: Loaders
 */

import { logger } from "./src/utils/logger";
import {
  loadCumulativeTargets,
  loadWeeklyTarget,
} from "./src/loaders/weekly-targets-loader";
import { loadAttendanceReport } from "./src/loaders/attendance-loader";
import {
  loadLearnerProgressReport,
  getLearnersSortedByCompletion,
} from "./src/loaders/learner-progress-loader";
import { loadConfig } from "./src/config/settings";
import type { WeekNumber } from "./src/types/common.types";

async function main() {
  logger.section("Phase 3: Testing Loaders");
  logger.info("=".repeat(60));

  // Load configuration
  const config = await loadConfig(".");
  logger.info(
    `\nConfiguration: Week ${config.current_week}, Threshold ${config.completion_threshold}%\n`,
  );

  // Test 1: Weekly Targets Loader
  logger.subsection("Testing Weekly Targets Loader");

  const targetsResult = await loadCumulativeTargets(
    ".",
    config.current_week as WeekNumber,
  );

  if (!targetsResult.success) {
    logger.error(`Failed: ${targetsResult.error}`);
  } else {
    const targets = targetsResult.data;
    logger.success(
      `Loaded cumulative targets for weeks 1-${targets.currentWeek}`,
    );
    logger.info(`   Total KCs: ${targets.totalKCs}`);
    logger.info(`   Total Labs: ${targets.totalLabs}`);
    logger.info(`   Weeks loaded: ${targets.weeks.length}`);

    logger.info("\n   Week-by-week breakdown:");
    for (const week of targets.weeks) {
      logger.info(
        `   Week ${week.week}: ${week.totalKCs} KCs, ${week.totalLabs} Labs`,
      );
    }
  }

  // Test 2: Attendance Loader
  logger.line();
  logger.line();
  logger.subsection("Testing Attendance Loader");

  const attendanceResult = await loadAttendanceReport(".");

  if (!attendanceResult.success) {
    logger.error(`Failed: ${attendanceResult.error}`);
  } else {
    const attendance = attendanceResult.data;
    logger.success(`Loaded attendance report`);
    logger.info(`   Sessions: ${attendance.stats.totalSessions}`);
    logger.info(`   Total minutes: ${attendance.stats.totalMinutes}`);
    logger.info(
      `   Average attendance rate: ${attendance.stats.averageAttendanceRate.toFixed(1)}%`,
    );
    logger.info(`   Learners tracked: ${attendance.learnerAttendance.length}`);

    logger.info("\n   Attendance distribution:");
    logger.info(`   Perfect (100%): ${attendance.stats.perfectAttendance}`);
    logger.info(`   Good (80-99%): ${attendance.stats.goodAttendance}`);
    logger.info(`   Fair (60-79%): ${attendance.stats.fairAttendance}`);
    logger.info(`   Poor (<60%): ${attendance.stats.poorAttendance}`);

    if (attendance.unmatchedAttendees.length > 0) {
      logger.warn(
        `\n   Unmatched attendees: ${attendance.unmatchedAttendees.length}`,
      );
      attendance.unmatchedAttendees.slice(0, 3).forEach(({ name, reason }) => {
        logger.info(`      - ${name}: ${reason}`);
      });
    } else {
      logger.success(`\n   All attendees matched!`);
    }
  }

  // Test 3: Learner Progress Loader
  logger.line();
  logger.line();
  logger.subsection("Testing Learner Progress Loader");

  const progressResult = await loadLearnerProgressReport(
    ".",
    config.completion_threshold,
  );

  if (!progressResult.success) {
    logger.error(`Failed: ${progressResult.error}`);
  } else {
    const progress = progressResult.data;
    logger.success(`Loaded learner progress report`);
    logger.info(`   Total learners: ${progress.summary.totalLearners}`);
    logger.info(`   Total KCs: ${progress.summary.totalKCs}`);
    logger.info(`   Total Labs: ${progress.summary.totalLabs}`);
    logger.info(`   Total Activities: ${progress.summary.totalActivities}`);
    logger.info(
      `   Average KC completion: ${progress.summary.averageKCCompletion.toFixed(1)}%`,
    );
    logger.info(
      `   Average Lab completion: ${progress.summary.averageLabCompletion.toFixed(1)}%`,
    );

    // Show top 5 performers
    logger.info("\n   Top 5 KC performers:");
    const topPerformers = getLearnersSortedByCompletion(progress, "KC").slice(
      0,
      5,
    );
    topPerformers.forEach((learner, index) => {
      const rate =
        learner.totalKCsAvailable > 0
          ? (
              (learner.totalKCsCompleted / learner.totalKCsAvailable) *
              100
            ).toFixed(1)
          : "0.0";
      logger.info(
        `      ${index + 1}. ${learner.student.fullName}: ${learner.totalKCsCompleted}/${learner.totalKCsAvailable} (${rate}%)`,
      );
    });

    // Show learners needing attention
    const needsAttention = progress.learners.filter((l) => {
      const rate =
        l.totalKCsAvailable > 0
          ? (l.totalKCsCompleted / l.totalKCsAvailable) * 100
          : 0;
      return rate < 50;
    });

    if (needsAttention.length > 0) {
      logger.warn(
        `\n   Learners needing attention (<50% KC completion): ${needsAttention.length}`,
      );
      needsAttention.slice(0, 3).forEach((learner) => {
        const rate =
          learner.totalKCsAvailable > 0
            ? (
                (learner.totalKCsCompleted / learner.totalKCsAvailable) *
                100
              ).toFixed(1)
            : "0.0";
        logger.info(
          `      - ${learner.student.fullName}: ${learner.totalKCsCompleted}/${learner.totalKCsAvailable} (${rate}%)`,
        );
      });
    }
  }

  // Summary
  logger.line();
  logger.line();
  logger.info("=".repeat(60));
  logger.success("Loader Tests Complete!");

  const allPassed =
    targetsResult.success && attendanceResult.success && progressResult.success;

  if (allPassed) {
    logger.success("All 3 loaders passed! Ready for orchestrator.");
    logger.line();
  } else {
    logger.error("Some loaders failed. Check errors above.");
    logger.line();
  }
}

main().catch(logger.error);
