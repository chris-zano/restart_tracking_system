/**
 * Configuration loader for settings.json
 */

import { readJSON, fileExists } from "../utils/file-utils";
import { logger } from "../utils/logger";
import type { Config } from "../types/common.types";

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Config = {
  current_week: 1,
  completion_threshold: 60, // 60% or higher is considered complete
};

/**
 * Load configuration from settings.json
 */
export async function loadConfig(basePath: string = "."): Promise<Config> {
  const configPath = `${basePath}/src/config/settings.json`;

  const exists = await fileExists(configPath);

  if (!exists) {
    logger.warn(`Config file not found at ${configPath}, using defaults`);
    return DEFAULT_CONFIG;
  }

  try {
    const config = await readJSON<Partial<Config>>(configPath);

    return {
      ...DEFAULT_CONFIG,
      ...config,
    };
  } catch (error) {
    logger.error(`Failed to parse config file: ${error}`);
    return DEFAULT_CONFIG;
  }
}

/**
 * Validate configuration values
 */
export function validateConfig(config: Config): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.current_week < 1 || config.current_week > 9) {
    errors.push(
      `current_week must be between 1 and 9, got ${config.current_week}`,
    );
  }

  if (config.completion_threshold !== undefined) {
    if (config.completion_threshold < 0 || config.completion_threshold > 100) {
      errors.push(
        `completion_threshold must be between 0 and 100, got ${config.completion_threshold}`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
