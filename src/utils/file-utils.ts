/**
 * File I/O utilities using Bun's native APIs
 */

import { file } from "bun";
import type { FileMetadata } from "../types/common.types";

/**
 * Check if a file exists
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    const f = file(path);
    return await f.exists();
  } catch {
    return false;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(path: string): Promise<FileMetadata> {
  const exists = await fileExists(path);

  if (!exists) {
    return { path, exists: false };
  }

  try {
    const f = file(path);
    const stat = await Bun.file(path).size;

    return {
      path,
      exists: true,
      size: stat,
      lastModified: new Date(), // Bun doesn't expose mtime directly, would need fs.stat
    };
  } catch (error) {
    return { path, exists: false };
  }
}

/**
 * Read CSV file as text
 */
export async function readCSV(path: string): Promise<string> {
  const f = file(path);
  return await f.text();
}

/**
 * Parse CSV text into rows
 * Simple implementation - for production, consider a robust CSV parser
 */
export function parseCSVText(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  const rows: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Simple CSV parsing (handles quoted fields)
    const row: string[] = [];
    let currentField = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // Field separator
        row.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }

    // Add last field
    row.push(currentField.trim());
    rows.push(row);
  }

  return rows;
}

/**
 * Read and parse CSV file in one go
 */
export async function readAndParseCSV(path: string): Promise<string[][]> {
  const text = await readCSV(path);
  return parseCSVText(text);
}

/**
 * Find most recent file in a directory by filename pattern
 */
export async function findMostRecentFile(
  dirPath: string,
  pattern: RegExp,
): Promise<string | null> {
  try {
    const dir = Bun.file(dirPath);
    // Note: Bun doesn't have built-in directory listing yet
    // We'll need to use Node's fs module for this
    const fs = await import("fs/promises");
    const files = await fs.readdir(dirPath);

    const matching = files.filter((f) => pattern.test(f));

    if (matching.length === 0) return null;
    if (matching.length === 1) return `${dirPath}/${matching[0]}`;

    // Get stats for all matching files
    const statsPromises = matching.map(async (f) => {
      const path = `${dirPath}/${f}`;
      const stat = await fs.stat(path);
      return { path, mtime: stat.mtime };
    });

    const stats = await Promise.all(statsPromises);
    stats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return stats[0]!.path;
  } catch {
    return null;
  }
}

/**
 * List all files in directory matching pattern
 */
export async function listFiles(
  dirPath: string,
  pattern?: RegExp,
): Promise<string[]> {
  try {
    const fs = await import("fs/promises");
    const files = await fs.readdir(dirPath);

    if (!pattern) return files;

    return files.filter((f) => pattern.test(f));
  } catch {
    return [];
  }
}

/**
 * Read JSON file
 */
export async function readJSON<T>(path: string): Promise<T> {
  const f = file(path);
  return await f.json();
}

/**
 * Write JSON file
 */
export async function writeJSON(path: string, data: unknown): Promise<void> {
  await Bun.write(path, JSON.stringify(data, null, 2));
}

/**
 * Ensure directory exists (create if needed)
 */
export async function ensureDir(dirPath: string): Promise<void> {
  const fs = await import("fs/promises");
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Write text file
 */
export async function writeText(path: string, text: string): Promise<void> {
  await Bun.write(path, text);
}
