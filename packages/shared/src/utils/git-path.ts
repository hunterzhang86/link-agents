/**
 * Git Path Utility
 *
 * Provides a function to get the path to the git binary.
 * Uses a bundled git binary if explicitly set; otherwise falls back to system git.
 */

import { existsSync } from 'fs';

// Global variable to store git path (set by Electron main process)
let bundledGitPath: string | null = null;

/**
 * Set the path to the bundled git binary (called by Electron main process)
 */
export function setBundledGitPath(path: string | null): void {
  bundledGitPath = path;
}

/**
 * Get the path to the git binary to use
 * Returns the bundled git path if set, otherwise returns 'git' (system git)
 */
export function getGitPath(): string {
  if (bundledGitPath && existsSync(bundledGitPath)) {
    return bundledGitPath;
  }
  return 'git';
}
