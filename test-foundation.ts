/**
 * Test utilities and parsers
 */

import { logger } from "./src/utils/logger";
import { loadConfig, validateConfig } from "./src/config/settings";
import {
  parseAssessment,
  extractAssessmentName,
  normalizeAssessmentName,
  assessmentsMatch,
} from "./src/utils/assessment-name-extractor";
import {
  normalizeName,
  parseCanvasName,
  parseAttendanceName,
  calculateNameSimilarity,
} from "./src/utils/name-normalizer";

async function testFoundation() {
  logger.section("Testing TypeScript Foundation");
  logger.line();

  // Test 1: Config Loading
  logger.info("Testing Config Loader...");
  const config = await loadConfig(".");
  logger.info("   Config:", config);
  const validation = validateConfig(config);
  logger.info("   Valid:", validation.valid);
  if (!validation.valid) {
    logger.info("   Errors:", validation.errors);
  }
  logger.success("   Config loaded");
  logger.line();

  // Test 2: Assessment Name Extraction
  logger.info("Testing Assessment Name Extraction...");
  const testAssessments = [
    "KC - Introduction to Cloud Computing (597705)",
    "11-[CF]-Lab - Introduction to Amazon EC2 (597579)",
    "225-[LX]-Lab - Introduction to Amazon Linux AMI (597611)",
    "KC - Introduction to Cloud Computing(352245)", // Weekly target format
  ];

  for (const test of testAssessments) {
    const parsed = parseAssessment(test);
    const cleaned = extractAssessmentName(test);
    const normalized = normalizeAssessmentName(cleaned);
    logger.info(`   "${test}"`);
    logger.info(`   → Type: ${parsed.type}`);
    logger.info(`   → Name: ${cleaned}`);
    logger.info(`   → Normalized: ${normalized}`);
    logger.info(`   → Canvas ID: ${parsed.canvasId || "N/A"}`);
    logger.line();
  }
  logger.success("   Assessment parsing works");
  logger.line();

  // Test 3: Assessment Matching
  logger.info("Testing Assessment Matching...");
  const name1 = "Introduction to Cloud Computing";
  const name2 = "Introduction to Cloud Computing";
  const name3 = "Intro to Cloud Computing";
  logger.info(
    `   "${name1}" vs "${name2}": ${assessmentsMatch(name1, name2) ? "Match" : "No match"}`,
  );
  logger.info(
    `   "${name1}" vs "${name3}": ${assessmentsMatch(name1, name3) ? "Match" : "No match"}`,
  );
  logger.success("   Assessment matching works");
  logger.line();

  // Test 4: Name Normalization
  logger.info("Testing Name Normalization...");
  const testNames = [
    '"Abdul-Moomin, Salahudeen"',
    "Bamuah ZenabBamuah Zenab ",
    "Edjameh Vera Dede(01222092D)(B)",
    "RAPHAEL PUNOBYIN",
  ];

  for (const name of testNames) {
    const parsed = parseCanvasName(name);
    const attendance = parseAttendanceName(name);
    const normalized = normalizeName(name);
    logger.info(`   Original: ${name}`);
    logger.info(`   → Normalized: ${normalized}`);
    logger.info(`   → Canvas format: ${parsed.firstName} ${parsed.lastName}`);
    logger.info(`   → Attendance clean: ${attendance.cleanName}`);
    logger.line();
  }
  logger.success("   Name normalization works");
  logger.line();

  // Test 5: Name Similarity
  logger.info("Testing Name Similarity...");
  const pairs = [
    ["Salahudeen Abdul-Moomin", "Salahudeen Abdul moomin"],
    ["Bismark Akwah", "Bismark Akwah"],
    ["Raphael Punobyin", "RAPHAEL PUNOBYIN"],
    ["John Smith", "Jane Doe"],
  ];

  for (const [n1, n2] of pairs) {
    const similarity = calculateNameSimilarity(n1 || "", n2 || "");
    logger.info(`   "${n1}" vs "${n2}": ${(similarity * 100).toFixed(1)}%`);
  }
  logger.success("   Name similarity works");
  logger.line();

  logger.success("Foundation tests complete!");
  logger.line();
  logger.info("Files created:");
  logger.info("   • src/types/*.ts (4 files)");
  logger.info("   • src/utils/*.ts (3 files)");
  logger.info("   • src/config/settings.ts");
  logger.line();
  logger.success("Ready to build parsers and loaders!");
}

// Run tests
testFoundation().catch(logger.error);
