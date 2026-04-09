/**
 * Test suite for Phase 4: Data Orchestrator
 */

import { logger } from "./src/utils/logger";
import { ingestAllData } from "./src/orchestrator/data-loader";

async function main() {
  logger.section("Phase 4: Testing Data Orchestrator");
  logger.info("=".repeat(60));

  // Test 1: Load all data sources
  logger.line();
  logger.subsection("Testing Full Data Ingestion");

  const result = await ingestAllData({
    basePath: ".",
    allowPartialData: true, // Continue even if some sources fail
  });

  if (!result.success) {
    logger.error(`\nFailed: ${result.error}`);
    if (result.failedSources) {
      logger.info(`   Failed sources: ${result.failedSources.join(", ")}`);
    }
    return;
  }

  const data = result.data!;

  logger.success("\nData Ingestion Successful!");
  logger.info(`   Loaded at: ${data.loadedAt.toISOString()}`);
  logger.info(`   Current week: ${data.currentWeek}`);
  logger.info(`   Completion threshold: ${data.completionThreshold}%`);

  if (result.failedSources && result.failedSources.length > 0) {
    logger.warn(`\nSome sources failed: ${result.failedSources.join(", ")}`);
  }

  // Test 2: Show data summary
  logger.line();
  logger.line();
  logger.subsection("Data Summary");

  logger.info(`\nStudents: ${data.students.length}`);
  logger.info(
    `   First 3: ${data.students
      .slice(0, 3)
      .map((s) => s.fullName)
      .join(", ")}`,
  );

  if (data.targets) {
    logger.info(`\nWeekly Targets:`);
    logger.info(`   Current week: ${data.targets.currentWeek}`);
    logger.info(`   Total KCs: ${data.targets.totalKCs}`);
    logger.info(`   Total Labs: ${data.targets.totalLabs}`);
    logger.info(`   Weeks loaded: ${data.targets.weeks.length}`);
  }

  if (data.attendance) {
    logger.info(`\nAttendance:`);
    logger.info(`   Sessions: ${data.attendance.stats.totalSessions}`);
    logger.info(
      `   Average rate: ${data.attendance.stats.averageAttendanceRate.toFixed(1)}%`,
    );
    logger.info(
      `   Perfect attendance: ${data.attendance.stats.perfectAttendance} students`,
    );
  }

  if (data.progress) {
    logger.info(`\nLearner Progress:`);
    logger.info(`   Learners: ${data.progress.summary.totalLearners}`);
    logger.info(`   KCs: ${data.progress.summary.totalKCs}`);
    logger.info(`   Labs: ${data.progress.summary.totalLabs}`);
    logger.info(
      `   Avg KC completion: ${data.progress.summary.averageKCCompletion.toFixed(1)}%`,
    );
    logger.info(
      `   Avg Lab completion: ${data.progress.summary.averageLabCompletion.toFixed(1)}%`,
    );
  }

  // Test 3: Validation Report
  logger.line();
  logger.line();
  logger.subsection("Validation Report");

  const validation = data.validation;

  logger.info(
    `\nValidation Status: ${validation.isValid ? "Valid" : "Invalid"}`,
  );
  logger.info(`Errors: ${validation.errors.length}`);
  logger.info(`Warnings: ${validation.warnings.length}`);

  logger.info("\nCross-Reference Checks:");
  logger.info(
    `   Students in class list: ${validation.checks.studentsInClassList}`,
  );
  logger.info(
    `   Students in gradebook: ${validation.checks.studentsInGradebook}`,
  );
  logger.info(
    `   Students in attendance: ${validation.checks.studentsInAttendance}`,
  );
  logger.info(`   Match rate: ${validation.checks.matchRate.toFixed(1)}%`);

  if (data.targets && data.progress) {
    logger.info("\nTargets vs Gradebook:");
    logger.info(
      `   Targets in gradebook: ${validation.checks.targetsVsGradebook.targetsInGradebook}`,
    );
    logger.info(
      `   Targets missing: ${validation.checks.targetsVsGradebook.targetsMissing}`,
    );
    logger.info(
      `   Extra assessments: ${validation.checks.targetsVsGradebook.extraAssessments}`,
    );
  }

  if (validation.errors.length > 0) {
    logger.error("\nErrors:");
    validation.errors.forEach((err, i) => {
      logger.error(`   ${i + 1}. [${err.severity}] ${err.message}`);
    });
  }

  if (validation.warnings.length > 0) {
    logger.warn("\nWarnings:");
    validation.warnings.forEach((warn, i) => {
      logger.warn(`   ${i + 1}. [${warn.type}] ${warn.message}`);
      if (warn.affectedItems && warn.affectedItems.length > 0) {
        logger.info(
          `      Affected: ${warn.affectedItems.slice(0, 3).join(", ")}...`,
        );
      }
    });
  }

  // Test 4: Partial Data Loading
  logger.line();
  logger.line();
  logger.subsection("Testing Partial Data Loading");

  const partialResult = await ingestAllData({
    basePath: ".",
    loadTargets: true,
    loadAttendance: false,
    loadProgress: false,
    skipValidation: true,
  });

  if (partialResult.success) {
    logger.success("Partial load successful (targets only)");
    logger.info(
      `   Targets: ${partialResult.data!.targets.totalKCs} KCs, ${partialResult.data!.targets.totalLabs} Labs`,
    );
  } else {
    logger.error(`Partial load failed: ${partialResult.error}`);
  }

  // Summary
  logger.line();
  logger.line();
  logger.info("=".repeat(60));
  logger.success("Orchestrator Tests Complete!");

  if (result.success) {
    logger.success("Data orchestrator is ready for analysis!");
    logger.line();
  } else {
    logger.error("Some tests failed. Check errors above.");
    logger.line();
  }
}

main().catch(logger.error);
