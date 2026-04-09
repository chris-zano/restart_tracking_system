#!/usr/bin/env bun

/**
 * Main Application Entry Point
 *
 * Unified CLI and API server for Canvas Gradebook Analysis
 *
 * Usage:
 *   bun run app analyze      - Run analysis
 *   bun run app serve        - Start API server
 *   bun run app help         - Show help
 */

import { runCLI } from "./src/cli/index";
import { startServer } from "./src/api/server";
import { logger } from "./src/utils/logger";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (command === "serve") {
    const port = parseInt(args[1] || "3000") || 3000;
    const server = startServer(port);

    // Graceful shutdown handler
    const shutdown = () => {
      logger.line();
      logger.info("Shutting down gracefully...");
      server.stop();
      logger.success("Server stopped");
      process.exit(0);
    };

    // Handle shutdown signals
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } else {
    await runCLI(args);
  }
}

main().catch((err) => {
  logger.error("Fatal error:");
  logger.error(err.message);
  process.exit(1);
});
