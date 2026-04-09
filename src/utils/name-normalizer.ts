/**
 * Utilities for normalizing and matching student names
 */

/**
 * Normalize a person's name for comparison
 * - Lowercase
 * - Remove extra whitespace
 * - Remove special characters
 * - Handle common variations
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // Remove parentheses content
    .replace(/["']/g, "") // Remove quotes
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/[^\w\s]/g, "") // Remove special chars
    .replace(/\b(mr|mrs|ms|dr|prof)\b/g, "") // Remove titles
    .trim();
}

/**
 * Extract first and last name from "LastName, FirstName" format
 */
export function parseCanvasName(fullName: string): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  // Remove quotes if present
  const cleaned = fullName.replace(/^["']|["']$/g, "").trim();
  const parts = cleaned.split(",").map((p) => p.trim());

  if (parts.length >= 2) {
    return {
      lastName: parts[0] || "",
      firstName: parts[1] || "",
      fullName: `${parts[1]} ${parts[0]}`,
    };
  }

  // Fallback if not in "Last, First" format
  const nameParts = cleaned.split(/\s+/);
  return {
    firstName: nameParts[0] || "",
    lastName: nameParts[nameParts.length - 1] || "",
    fullName: cleaned,
  };
}

/**
 * Parse attendance name (various formats from Zoom)
 * Examples:
 *   "Bamuah ZenabBamuah Zenab "
 *   "Bismark Akwah"
 *   "RAPHAEL PUNOBYIN"
 *   "Edjameh Vera Dede(01222092D)(B)"
 */
export function parseAttendanceName(name: string): {
  cleanName: string;
  normalized: string;
  variants: string[];
} {
  // Remove student IDs and other metadata in parentheses
  let cleaned = name.replace(/\([^)]*\)/g, "").trim();

  // Detect and fix concatenated repeated names (e.g., "Bamuah ZenabBamuah Zenab")
  // Look for capital letter in middle of what should be a word boundary
  // Pattern: word1 word2WORD3 word4 → word1 word2 WORD3 word4
  cleaned = cleaned.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Remove repeated consecutive words (e.g., "Bamuah Zenab Bamuah Zenab" → "Bamuah Zenab")
  const words = cleaned.split(/\s+/);

  // Check if it's a repeated pattern (first half = second half)
  if (words.length > 1 && words.length % 2 === 0) {
    const midpoint = words.length / 2;
    const firstHalf = words.slice(0, midpoint).join(" ").toLowerCase();
    const secondHalf = words.slice(midpoint).join(" ").toLowerCase();

    if (firstHalf === secondHalf) {
      cleaned = words.slice(0, midpoint).join(" ");
    }
  }

  const normalized = normalizeName(cleaned);

  // Generate variants for matching
  const variants = [normalized, cleaned.toLowerCase()];

  // Add reversed name variant
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) {
    variants.push(normalizeName(`${parts[parts.length - 1]} ${parts[0]}`));
  }

  return {
    cleanName: cleaned,
    normalized,
    variants: [...new Set(variants)], // Deduplicate
  };
}

/**
 * Calculate similarity score between two names (0-1)
 * Uses Levenshtein distance
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const normalized1 = normalizeName(name1);
  const normalized2 = normalizeName(name2);

  // Exact match
  if (normalized1 === normalized2) {
    return 1.0;
  }

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  if (maxLength === 0) return 0;

  // Convert distance to similarity (0-1)
  return 1 - distance / maxLength;
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] = Math.min(
          dp[i - 1]![j]! + 1, // deletion
          dp[i]![j - 1]! + 1, // insertion
          dp[i - 1]![j - 1]! + 1, // substitution
        );
      }
    }
  }

  return dp[m]![n]!;
}

/**
 * Check if two names match (with fuzzy logic)
 */
export function namesMatch(
  name1: string,
  name2: string,
  threshold: number = 0.8,
): boolean {
  return calculateNameSimilarity(name1, name2) >= threshold;
}

/**
 * Find best matching name from a list
 */
export function findBestNameMatch(
  searchName: string,
  candidates: string[],
  minSimilarity: number = 0.7,
): { match: string; score: number } | null {
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = calculateNameSimilarity(searchName, candidate);
    if (score > bestScore && score >= minSimilarity) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestMatch ? { match: bestMatch, score: bestScore } : null;
}
