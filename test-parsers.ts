/**
 * Test all parsers with real data
 */

import { logger } from "./src/utils/logger";
import { parseClassList } from "./src/parsers/class-list-parser";
import { parseWeeklyTargets } from "./src/parsers/weekly-targets-parser";
import { parseAllAttendance } from "./src/parsers/attendance-parser";
import {
  findAndParseLearnerProgress,
  getAssessmentsByType,
} from "./src/parsers/learner-progress-parser";
import { loadConfig } from "./src/config/settings";

async function testParsers() {
  logger.section("Testing All Parsers with Real Data");
  logger.line();

  const basePath = ".";

  // Test 1: Class List Parser
  logger.info("Testing Class List Parser...");
  const classListResult = await parseClassList(
    `${basePath}/class_list/class_list.csv`,
  );

  if (classListResult.success) {
    logger.success(`   Loaded ${classListResult.data.length} students`);
    if (classListResult.data.length > 0) {
      logger.info(
        `   Sample: ${classListResult.data[0]!.fullName} → ${classListResult.data[0]!.email}`,
      );
    }
  } else {
    logger.error(`   Failed: ${classListResult.error}`);
  }
  logger.line();

  // Test 2: Weekly Targets Parser
  logger.info("Testing Weekly Targets Parser...");
  const config = await loadConfig(basePath);
  const targetsResult = await parseWeeklyTargets(
    basePath,
    config.current_week as any,
  );

  if (targetsResult.success) {
    logger.success(`   Loaded ${targetsResult.data.length} weeks of targets`);
    for (const week of targetsResult.data) {
      logger.info(
        `   Week ${week.week}: ${week.totalKCs} KCs, ${week.totalLabs} Labs`,
      );
    }

    // Show sample from week 1
    if (targetsResult.data.length > 0) {
      const week1 = targetsResult.data[0];
      if (week1) {
        logger.info(`\n   Week 1 Sample KC: "${week1.kcs[0]?.name}"`);
        logger.info(`   Week 1 Sample Lab: "${week1.labs[0]?.name}"`);
      }
    }
  } else {
    logger.error(`   Failed: ${targetsResult.error}`);
  }
  logger.line();

  // Test 3: Attendance Parser
  logger.info("Testing Attendance Parser...");
  const attendanceResult = await parseAllAttendance(basePath);

  if (attendanceResult.success) {
    logger.success(
      `   Loaded ${attendanceResult.data.length} attendance sessions`,
    );

    for (const session of attendanceResult.data) {
      const date = session.metadata.startTime.toLocaleDateString();
      logger.info(
        `   ${date}: ${session.attendees.length} attendees, ${session.metadata.duration} min`,
      );
    }

    // Show sample attendee
    if (
      attendanceResult.data.length > 0 &&
      attendanceResult.data[0] &&
      attendanceResult.data[0].attendees.length > 0
    ) {
      const firstSession = attendanceResult.data[0];
      const sampleAttendee = firstSession.attendees[0];
      if (sampleAttendee) {
        logger.info(
          `\n   Sample attendee: ${sampleAttendee.name} (${sampleAttendee.durationMinutes} min)`,
        );
      }
    }
  } else {
    logger.error(`   Failed: ${attendanceResult.error}`);
  }
  logger.line();

  // Test 4: Learner Progress Parser
  logger.info("Testing Learner Progress Parser...");
  const progressResult = await findAndParseLearnerProgress(basePath);

  if (progressResult.success) {
    const { filePath, context } = progressResult.data;
    const fileName = filePath.split("/").pop() || filePath.split("\\").pop();

    logger.success(`   Loaded gradebook: ${fileName}`);
    logger.info(`   Total rows: ${context.totalRows}`);
    logger.info(`   Assessment columns: ${context.assessmentColumns.length}`);
    logger.info(
      `   Student records: ${context.totalRows - context.dataStartRow}`,
    );

    // Break down by type
    const byType = getAssessmentsByType(context.assessmentColumns);
    logger.info(`\n   Knowledge Checks (KCs): ${byType.kcs.length}`);
    logger.info(`   Labs: ${byType.labs.length}`);
    logger.info(`   Activities: ${byType.activities.length}`);
    logger.info(`   Graded (100 pts): ${byType.graded.length}`);
    logger.info(`   Ungraded (1 pt): ${byType.ungraded.length}`);

    // Show samples
    if (byType.kcs.length > 0) {
      const firstKC = byType.kcs[0];
      if (firstKC) {
        logger.info(`\n   Sample KC: "${firstKC.assessment.name}"`);
        logger.info(`      Canvas ID: ${firstKC.assessment.canvasId}`);
        logger.info(`      Points possible: ${firstKC.pointsPossible}`);
      }
    }

    if (byType.labs.length > 0) {
      const firstLab = byType.labs[0];
      if (firstLab) {
        logger.info(`\n   Sample Lab: "${firstLab.assessment.name}"`);
        logger.info(`      Canvas ID: ${firstLab.assessment.canvasId}`);
        logger.info(`      Points possible: ${firstLab.pointsPossible}`);
      }
    }
  } else {
    logger.error(`   Failed: ${progressResult.error}`);
  }
  logger.line();

  // Summary
  logger.info(
    "═══════════════════════════════════════════════════════════════",
  );
  logger.success("Parser Tests Complete!");
  logger.line();

  const results = [
    classListResult.success,
    targetsResult.success,
    attendanceResult.success,
    progressResult.success,
  ];

  const passed = results.filter((r) => r).length;
  const total = results.length;

  if (passed === total) {
    logger.success(`All ${total} parsers passed! Ready for loaders.`);
  } else {
    logger.warn(`${passed}/${total} parsers passed. Review errors above.`);
  }
}

testParsers().catch(logger.error);
