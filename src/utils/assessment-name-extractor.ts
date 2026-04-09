/**
 * Utilities for extracting and normalizing assessment names
 */

import type { Assessment, AssessmentType } from "../types/common.types";

/**
 * Extract assessment type from column/row name
 */
export function extractAssessmentType(text: string): AssessmentType {
  const normalized = text.trim();

  if (
    normalized.startsWith("KC - ") ||
    normalized.includes("Knowledge Check")
  ) {
    return "KC";
  }

  if (normalized.includes("-Lab -") || normalized.includes("Lab - ")) {
    return "Lab";
  }

  if (normalized.includes("Activity")) {
    return "Activity";
  }

  return "Unknown";
}

/**
 * Extract Canvas ID from parentheses
 * Examples:
 *   "KC - Introduction to Cloud Computing (597705)" → "597705"
 *   "11-[CF]-Lab - Introduction to Amazon EC2 (597579)" → "597579"
 */
export function extractCanvasId(text: string): string | undefined {
  const match = text.match(/\((\d+)\)$/);
  return match?.[1];
}

/**
 * Extract weekly target ID from parentheses
 * Examples:
 *   "KC - Introduction to Cloud Computing(352245)" → "352245"
 *   "1-[CF]-Lab - Sandbox Environment(494967)" → "494967"
 */
export function extractWeeklyTargetId(text: string): string | undefined {
  const match = text.match(/\((\d+)\)$/);
  return match?.[1];
}

/**
 * Remove ID from text
 * "KC - Introduction to Cloud Computing (597705)" → "KC - Introduction to Cloud Computing"
 */
export function removeId(text: string): string {
  return text.replace(/\s*\(\d+\)\s*$/, "").trim();
}

/**
 * Extract clean assessment name (without prefix and ID)
 * Examples:
 *   "KC - Introduction to Cloud Computing (597705)" → "Introduction to Cloud Computing"
 *   "11-[CF]-Lab - Introduction to Amazon EC2 (597579)" → "Introduction to Amazon EC2"
 *   "225-[LX]-Lab - Introduction to Amazon Linux AMI (597611)" → "Introduction to Amazon Linux AMI"
 */
export function extractAssessmentName(text: string): string {
  let cleaned = removeId(text);

  // Remove "KC - " prefix
  cleaned = cleaned.replace(/^KC\s*-\s*/i, "");

  // Remove lab prefixes like "11-[CF]-Lab - " or "225-[LX]-Lab - "
  cleaned = cleaned.replace(/^\d+-\[[A-Z]+\]-Lab\s*-\s*/i, "");

  // Remove generic "Lab - " prefix
  cleaned = cleaned.replace(/^Lab\s*-\s*/i, "");

  // Remove "Activity - " prefix
  cleaned = cleaned.replace(/^Activity\s*-\s*/i, "");

  return cleaned.trim();
}

/**
 * Parse full assessment details from column/row name
 */
export function parseAssessment(
  text: string,
  source: "canvas" | "weekly-target" = "canvas",
): Assessment {
  const type = extractAssessmentType(text);
  const name = extractAssessmentName(text);
  const rawName = text;

  const assessment: Assessment = {
    type,
    name,
    rawName,
  };

  if (source === "canvas") {
    assessment.canvasId = extractCanvasId(text);
  } else {
    assessment.weeklyTargetId = extractWeeklyTargetId(text);
  }

  return assessment;
}

/**
 * Normalize assessment name for comparison
 * - Lowercase
 * - Remove extra whitespace
 * - Remove special characters
 * - Handle common variations
 */
export function normalizeAssessmentName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/[[\]()]/g, "") // Remove brackets/parens
    .replace(/\s*-\s*/g, " ") // Normalize hyphens
    .replace(/&/g, "and") // Normalize ampersand
    .replace(/[^\w\s]/g, ""); // Remove special chars
}

/**
 * Check if two assessment names match (fuzzy comparison)
 */
export function assessmentsMatch(name1: string, name2: string): boolean {
  const normalized1 = normalizeAssessmentName(name1);
  const normalized2 = normalizeAssessmentName(name2);

  // Exact match
  if (normalized1 === normalized2) {
    return true;
  }

  // One contains the other (handles variations)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    const minLength = Math.min(normalized1.length, normalized2.length);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    // Only match if length difference is small (< 20%)
    if ((maxLength - minLength) / maxLength < 0.2) {
      return true;
    }
  }

  return false;
}

/**
 * Find matching assessment in a list
 */
export function findMatchingAssessment(
  needle: Assessment,
  haystack: Assessment[],
): Assessment | undefined {
  return haystack.find((item) => assessmentsMatch(needle.name, item.name));
}
