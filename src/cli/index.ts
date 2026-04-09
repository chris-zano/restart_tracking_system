/**
 * CLI Entry Point
 */

import { analyzeCommand, exportAttendancePassCommand, helpCommand } from "./commands";
import { logger } from "../utils/logger";

export async function runCLI(args: string[]): Promise<void> {
  const command = args[0];

  switch (command) {
    case "analyze":
      await analyzeCommand();
      break;

    case "export-attendance-pass":
      await exportAttendancePassCommand();
      break;

    case "help":
    case undefined:
      helpCommand();
      break;

    default:
      logger.error(`Unknown command: ${command}`);
      logger.info("Run 'bun run app help' for available commands");
      process.exit(1);
  }
}
