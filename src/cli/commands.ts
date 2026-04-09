/**
 * CLI Commands
 */

import { ingestAllData } from "../orchestrator/data-loader";
import { analyzeTargetCompletion } from "../analysis/target-analyzer";
import { generateAttendanceExportCSV } from "../analysis/attendance-export";
import { ensureDir, writeText } from "../utils/file-utils";
import { logger } from "../utils/logger";

/**
 * Run analysis for current week
 */
export async function analyzeCommand(): Promise<void> {
  logger.section("Running Analysis");

  // Load data
  logger.info("Loading data...");
  const dataResult = await ingestAllData();

  if (!dataResult.success) {
    logger.error(`Failed to load data: ${dataResult.error}`);
    process.exit(1);
  }

  const data = dataResult.data;
  if (!data) {
    logger.error("No data available");
    process.exit(1);
  }
  logger.success(
    `Data loaded: ${data.students.length} students, week ${data.currentWeek}`,
  );

  // Run analysis
  logger.info("Analyzing target completion...");
  const report = analyzeTargetCompletion(data);

  // Display summary
  logger.subsection("Class-Wide Statistics");
  const stats = report.classStats;
  logger.info(`Total Learners: ${stats.totalLearners}`);
  logger.info(
    `Average Completion: ${stats.averageOverallCompletion.toFixed(1)}%`,
  );
  logger.info(`  KCs: ${stats.averageKCCompletion.toFixed(1)}%`);
  logger.info(`  Labs: ${stats.averageLabCompletion.toFixed(1)}%`);
  logger.line();

  logger.info("Distribution:");
  logger.success(`  Ahead (≥90%): ${stats.learnersAhead} learners`);
  logger.info(`  On Track (70-89%): ${stats.learnersOnTrack} learners`);
  logger.warn(`  Behind (50-69%): ${stats.learnersBehind} learners`);
  logger.error(`  At Risk (<50%): ${stats.learnersAtRisk} learners`);

  logger.line();
  logger.success("Analysis complete!");
}

/**
 * Export learners meeting attendance pass threshold to CSV
 */
export async function exportAttendancePassCommand(): Promise<void> {
  logger.section("Exporting Passing Attendance");

  // Load attendance data only
  logger.info("Loading attendance data...");
  const dataResult = await ingestAllData({
    loadTargets: false,
    loadProgress: false,
  });

  if (!dataResult.success || !dataResult.data) {
    logger.error(`Failed to load data: ${dataResult.error}`);
    process.exit(1);
  }

  const data = dataResult.data;
  const threshold = data.attendanceThreshold;

  logger.success(
    `Loaded ${data.attendance.learnerAttendance.length} learners, ${data.attendance.stats.totalSessions} sessions`,
  );
  logger.info(`Pass threshold: ${threshold}%`);

  // Generate CSV
  logger.info("Generating CSV...");
  const { csv, count } = generateAttendanceExportCSV(data.attendance, threshold);

  // Ensure export directory exists
  await ensureDir("exports");

  // Generate filename with date
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now
    .toISOString()
    .split("T")[1]
    .split(".")[0]
    .replace(/:/g, "");
  const fileName = `passing-attendance-${dateStr}T${timeStr}.csv`;
  const filePath = `exports/${fileName}`;

  // Write file
  logger.info(`Writing to ${filePath}...`);
  await writeText(filePath, csv);

  // Summary
  logger.subsection("Export Summary");
  logger.success(`✓ Exported ${count} learners meeting ${threshold}% threshold`);
  logger.info(`Total learners: ${data.attendance.learnerAttendance.length}`);
  logger.info(`Below threshold: ${data.attendance.learnerAttendance.length - count}`);
  logger.info(`Unmatched attendees: ${data.attendance.unmatchedAttendees.length}`);
  logger.line();
  logger.success(`File: ${filePath}`);
}

/**
 * Display help information
 */
export function helpCommand(): void {
  logger.section("Canvas Gradebook Analysis - Help");

  logger.info("Available commands:");
  logger.line();

  logger.info("  analyze                 - Run analysis for current week");
  logger.info("  export-attendance-pass  - Export learners meeting attendance threshold");
  logger.info("  serve                   - Start API server");
  logger.info("  help                    - Show this help message");

  logger.line();
  logger.info("Examples:");
  logger.info("  bun run app analyze");
  logger.info("  bun run app export-attendance-pass");
  logger.info("  bun run app serve");
}
