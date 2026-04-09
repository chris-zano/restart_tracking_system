/**
 * Professional logging utility with color codes
 */

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  // Background colors
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
} as const;

/**
 * Log level type
 */
export type LogLevel = "debug" | "info" | "success" | "warn" | "error";

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  timestamp: boolean;
  colors: boolean;
}

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  level: "info",
  timestamp: false,
  colors: true,
};

let config = { ...defaultConfig };

/**
 * Configure logger
 */
export function configure(options: Partial<LoggerConfig>): void {
  config = { ...config, ...options };
}

/**
 * Log levels hierarchy
 */
const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  success: 1,
  warn: 2,
  error: 3,
};

/**
 * Check if message should be logged based on level
 */
function shouldLog(level: LogLevel): boolean {
  return logLevels[level] >= logLevels[config.level];
}

/**
 * Format timestamp
 */
function getTimestamp(): string {
  if (!config.timestamp) return "";
  const now = new Date();
  return `[${now.toISOString()}] `;
}

/**
 * Colorize text
 */
function colorize(text: string, color: string): string {
  if (!config.colors) return text;
  return `${color}${text}${colors.reset}`;
}

/**
 * Format log message
 */
function formatMessage(
  level: LogLevel,
  message: string,
  color: string,
): string {
  const timestamp = getTimestamp();
  const levelStr = colorize(`[${level.toUpperCase()}]`, color);
  return `${timestamp}${levelStr} ${message}`;
}

/**
 * Debug log (gray/dim)
 */
export function debug(message: string, ...args: any[]): void {
  if (!shouldLog("debug")) return;
  const formatted = formatMessage("debug", message, colors.dim);
  console.log(formatted, ...args);
}

/**
 * Info log (blue)
 */
export function info(message: string, ...args: any[]): void {
  if (!shouldLog("info")) return;
  const formatted = formatMessage("info", message, colors.blue);
  console.log(formatted, ...args);
}

/**
 * Success log (green)
 */
export function success(message: string, ...args: any[]): void {
  if (!shouldLog("success")) return;
  const formatted = formatMessage("success", message, colors.green);
  console.log(formatted, ...args);
}

/**
 * Warning log (yellow)
 */
export function warn(message: string, ...args: any[]): void {
  if (!shouldLog("warn")) return;
  const formatted = formatMessage("warn", message, colors.yellow);
  console.warn(formatted, ...args);
}

/**
 * Error log (red)
 */
export function error(message: string, ...args: any[]): void {
  if (!shouldLog("error")) return;
  const formatted = formatMessage("error", message, colors.red);
  console.error(formatted, ...args);
}

/**
 * Log section header
 */
export function section(title: string): void {
  if (!shouldLog("info")) return;
  const line = "=".repeat(60);
  console.log(colorize(line, colors.cyan));
  console.log(colorize(title, colors.bright + colors.cyan));
  console.log(colorize(line, colors.cyan));
}

/**
 * Log subsection header
 */
export function subsection(title: string): void {
  if (!shouldLog("info")) return;
  const line = "-".repeat(60);
  console.log(colorize(line, colors.cyan));
  console.log(colorize(title, colors.cyan));
  console.log(colorize(line, colors.cyan));
}

/**
 * Log a simple line
 */
export function line(): void {
  console.log();
}

/**
 * Default logger export
 */
export const logger = {
  configure,
  debug,
  info,
  success,
  warn,
  error,
  section,
  subsection,
  line,
};

export default logger;
