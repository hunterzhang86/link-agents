/**
 * Git Path Utility
 *
 * Provides a function to get the path to the git binary.
 * In packaged Electron apps, uses the bundled git binary.
 * In development or non-Electron environments, falls back to system git.
 */

import { join } from 'path';
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

/**
 * Get the path to bundled git binary for Electron app
 * This should be called from Electron main process during initialization
 */
export function getBundledGitPathForElectron(
  isPackaged: boolean,
  basePath: string,
  resourcesPath?: string
): string | null {
  if (!isPackaged) {
    return null; // Use system git in development
  }

  // Determine git binary name based on platform
  const gitBinary = process.platform === 'win32' ? 'git.exe' : 'git';

  const candidates = [
    basePath,
    // On Windows and macOS, git may be in extraResources (process.resourcesPath).
    resourcesPath,
    resourcesPath ? join(resourcesPath, 'app') : undefined,
  ].filter(Boolean) as string[];

  for (const candidateBase of candidates) {
    const gitPath = join(candidateBase, 'vendor', 'git', 'bin', gitBinary);
    if (existsSync(gitPath)) {
      return gitPath;
    }
  }

  return null; // Fall back to system git if bundled git not found
}
