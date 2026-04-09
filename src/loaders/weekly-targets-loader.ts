/**
 * Weekly Targets Loader
 * Loads and accumulates weekly targets from week 1 through current week
 */

import { parseWeeklyTargetFile } from "../parsers/weekly-targets-parser";
import type {
  CumulativeTargets,
  WeeklyTarget,
} from "../types/weekly-targets.types";
import type { Assessment, Result, WeekNumber } from "../types/common.types";

/**
 * Load cumulative targets from week 1 to currentWeek
 */
export async function loadCumulativeTargets(
  basePath: string,
  currentWeek: WeekNumber,
): Promise<Result<CumulativeTargets>> {
  try {
    const weeks: WeeklyTarget[] = [];
    const allKCs: Assessment[] = [];
    const allLabs: Assessment[] = [];
    const perWeek: Record<WeekNumber, WeeklyTarget> = {} as Record<
      WeekNumber,
      WeeklyTarget
    >;

    // Load targets for each week from 1 to currentWeek
    for (let week = 1; week <= currentWeek; week++) {
      const weekNumber = week as WeekNumber;
      const filePath = `${basePath}/weekly_targets/week_${week}.csv`;
      const result = await parseWeeklyTargetFile(filePath, weekNumber);

      if (!result.success) {
        return {
          success: false,
          error: `Failed to load week ${week}: ${result.error}`,
        };
      }

      const weeklyTarget: WeeklyTarget = {
        week: weekNumber,
        kcs: result.data.kcs,
        labs: result.data.labs,
        totalKCs: result.data.totalKCs,
        totalLabs: result.data.totalLabs,
      };

      weeks.push(weeklyTarget);
      perWeek[weekNumber] = weeklyTarget;

      // Accumulate assessments (avoiding duplicates by weeklyTargetId or name)
      for (const kc of result.data.kcs) {
        const isDuplicate = allKCs.find(
          (existing) =>
            (kc.weeklyTargetId &&
              existing.weeklyTargetId === kc.weeklyTargetId) ||
            (kc.canvasId && existing.canvasId === kc.canvasId) ||
            (existing.name === kc.name && existing.type === kc.type),
        );
        if (!isDuplicate) {
          allKCs.push(kc);
        }
      }

      for (const lab of result.data.labs) {
        const isDuplicate = allLabs.find(
          (existing) =>
            (lab.weeklyTargetId &&
              existing.weeklyTargetId === lab.weeklyTargetId) ||
            (lab.canvasId && existing.canvasId === lab.canvasId) ||
            (existing.name === lab.name && existing.type === lab.type),
        );
        if (!isDuplicate) {
          allLabs.push(lab);
        }
      }
    }

    const cumulativeTargets: CumulativeTargets = {
      currentWeek,
      weeks,
      allKCs,
      allLabs,
      totalKCs: allKCs.length,
      totalLabs: allLabs.length,
      perWeek,
    };

    return {
      success: true,
      data: cumulativeTargets,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error loading cumulative targets: ${error}`,
    };
  }
}

/**
 * Get targets for a specific week
 */
export async function loadWeeklyTarget(
  basePath: string,
  week: WeekNumber,
): Promise<Result<WeeklyTarget>> {
  const filePath = `${basePath}/weekly_targets/week_${week}.csv`;
  const result = await parseWeeklyTargetFile(filePath, week);

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Check if an assessment is in the targets
 */
export function isInTargets(
  assessment: Assessment,
  targets: CumulativeTargets,
): boolean {
  const list = assessment.type === "KC" ? targets.allKCs : targets.allLabs;
  return list.some((target) => target.canvasId === assessment.canvasId);
}

/**
 * Get week number for a specific assessment
 */
export function getWeekForAssessment(
  assessment: Assessment,
  targets: CumulativeTargets,
): WeekNumber | null {
  for (const weeklyTarget of targets.weeks) {
    const list =
      assessment.type === "KC" ? weeklyTarget.kcs : weeklyTarget.labs;
    if (list.some((target) => target.canvasId === assessment.canvasId)) {
      return weeklyTarget.week;
    }
  }
  return null;
}
