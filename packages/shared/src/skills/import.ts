/**
 * Skills Import
 *
 * Functions for importing skills from various sources:
 * - ZIP archives
 * - Folders
 * - Git repositories
 * - Individual SKILL.md files
 * - URLs (skills.sh or direct downloads)
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  cpSync,
  rmSync,
  readdirSync,
  statSync,
} from 'fs';
import { join, basename, extname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import AdmZip from 'adm-zip';
import type { LoadedSkill, SkillSource, SkillCatalogEntry } from './types.ts';
import { getWorkspaceSkillsPath } from '../workspaces/storage.ts';
import { loadSkill, skillExists } from './storage.ts';
import { getGitPath } from '../utils/git-path.ts';

const execAsync = promisify(exec);

// ============================================================
// Helper Functions
// ============================================================

/**
 * Generate unique slug if conflict exists
 */
function resolveSlugConflict(workspaceRoot: string, baseSlug: string): string {
  let slug = baseSlug;
  let counter = 1;
  while (skillExists(workspaceRoot, slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

/**
 * Sanitize slug to prevent path traversal
 */
function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extract slug from folder name or SKILL.md filename
 */
function extractSlugFromPath(path: string): string {
  const name = basename(path, extname(path));
  return sanitizeSlug(name);
}

/**
 * Create temporary directory
 */
function createTempDir(): string {
  const tempPath = join(tmpdir(), `skill-import-${randomBytes(8).toString('hex')}`);
  mkdirSync(tempPath, { recursive: true });
  return tempPath;
}

/**
 * Validate that directory contains SKILL.md
 */
function validateSkillDirectory(dirPath: string): boolean {
  const skillFile = join(dirPath, 'SKILL.md');
  return existsSync(skillFile) && statSync(skillFile).isFile();
}

/**
 * Save source metadata to .source.json
 */
function saveSourceMetadata(skillDir: string, source: SkillSource): void {
  const sourceFile = join(skillDir, '.source.json');
  writeFileSync(sourceFile, JSON.stringify(source, null, 2), 'utf-8');
}

/**
 * Copy directory contents recursively
 */
function copyDirectory(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

// ============================================================
// Import Functions
// ============================================================

/**
 * Import skill from ZIP archive
 */
export async function importSkillFromZip(
  workspaceRoot: string,
  zipPath: string,
  source?: Partial<SkillSource>
): Promise<LoadedSkill> {
  // Validate ZIP file exists
  if (!existsSync(zipPath)) {
    throw new Error(`ZIP file not found: ${zipPath}`);
  }

  // Create temp directory
  const tempDir = createTempDir();

  try {
    // Extract ZIP
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempDir, true);

    // Find SKILL.md in extracted contents
    let skillDir: string | null = null;

    // Check if SKILL.md is at root
    if (validateSkillDirectory(tempDir)) {
      skillDir = tempDir;
    } else {
      // Check subdirectories
      const entries = readdirSync(tempDir);
      for (const entry of entries) {
        const entryPath = join(tempDir, entry);
        if (statSync(entryPath).isDirectory() && validateSkillDirectory(entryPath)) {
          skillDir = entryPath;
          break;
        }
      }
    }

    if (!skillDir) {
      throw new Error('ZIP archive does not contain a valid SKILL.md file');
    }

    // Extract slug from ZIP filename or directory name
    const suggestedSlug = extractSlugFromPath(skillDir === tempDir ? zipPath : skillDir);
    const slug = resolveSlugConflict(workspaceRoot, suggestedSlug);

    // Copy to skills directory
    const skillsDir = getWorkspaceSkillsPath(workspaceRoot);
    const destDir = join(skillsDir, slug);
    copyDirectory(skillDir, destDir);

    // Save source metadata
    const sourceMetadata: SkillSource = {
      type: 'zip',
      installedAt: new Date().toISOString(),
      ...source,
    };
    saveSourceMetadata(destDir, sourceMetadata);

    // Load and return skill
    const loadedSkill = loadSkill(workspaceRoot, slug);
    if (!loadedSkill) {
      throw new Error('Failed to load imported skill');
    }

    return loadedSkill;
  } finally {
    // Cleanup temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * Import skill from folder
 */
export async function importSkillFromFolder(
  workspaceRoot: string,
  folderPath: string,
  source?: Partial<SkillSource>
): Promise<LoadedSkill> {
  // Validate folder exists
  if (!existsSync(folderPath) || !statSync(folderPath).isDirectory()) {
    throw new Error(`Folder not found: ${folderPath}`);
  }

  // Validate SKILL.md exists
  if (!validateSkillDirectory(folderPath)) {
    throw new Error('Folder does not contain a valid SKILL.md file');
  }

  // Extract slug from folder name
  const suggestedSlug = extractSlugFromPath(folderPath);
  const slug = resolveSlugConflict(workspaceRoot, suggestedSlug);

  // Copy to skills directory
  const skillsDir = getWorkspaceSkillsPath(workspaceRoot);
  const destDir = join(skillsDir, slug);
  copyDirectory(folderPath, destDir);

  // Save source metadata
  const sourceMetadata: SkillSource = {
    type: 'folder',
    installedAt: new Date().toISOString(),
    ...source,
  };
  saveSourceMetadata(destDir, sourceMetadata);

  // Load and return skill
  const loadedSkill = loadSkill(workspaceRoot, slug);
  if (!loadedSkill) {
    throw new Error('Failed to load imported skill');
  }

  return loadedSkill;
}

/**
 * Import skill from Git repository
 */
export async function importSkillFromGit(
  workspaceRoot: string,
  gitUrl: string,
  branch?: string
): Promise<LoadedSkill> {
  // Normalize Git URL - add .git if it's a GitHub URL without it
  let normalizedUrl = gitUrl.trim();
  if (normalizedUrl.match(/^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/)) {
    normalizedUrl = normalizedUrl.replace(/\/$/, '') + '.git';
  }

  // Validate Git URL format
  const isValidGitUrl =
    normalizedUrl.match(/^https?:\/\/.+/) || // HTTP(S) URL
    normalizedUrl.match(/^git@.+:.+/); // SSH URL

  if (!isValidGitUrl) {
    throw new Error('Invalid Git URL format. Expected HTTP(S) or SSH URL.');
  }

  // Create temp directory
  const tempDir = createTempDir();

  try {
    // Clone repository
    const gitPath = getGitPath();
    const branchArg = branch ? `-b ${branch}` : '';
    const cloneCommand = `"${gitPath}" clone ${branchArg} --depth 1 "${normalizedUrl}" "${tempDir}"`;

    try {
      await execAsync(cloneCommand);
    } catch (gitError: any) {
      throw new Error(`Failed to clone repository: ${gitError.message || String(gitError)}`);
    }

    // Validate SKILL.md exists
    if (!validateSkillDirectory(tempDir)) {
      throw new Error('Git repository does not contain a valid SKILL.md file in the root directory');
    }

    // Extract slug from repo name
    const repoName = gitUrl.split('/').pop()?.replace('.git', '') || 'skill';
    const suggestedSlug = sanitizeSlug(repoName);
    const slug = resolveSlugConflict(workspaceRoot, suggestedSlug);

    // Copy to skills directory (exclude .git)
    const skillsDir = getWorkspaceSkillsPath(workspaceRoot);
    const destDir = join(skillsDir, slug);
    mkdirSync(destDir, { recursive: true });

    const entries = readdirSync(tempDir);
    for (const entry of entries) {
      if (entry !== '.git') {
        const srcPath = join(tempDir, entry);
        const destPath = join(destDir, entry);
        cpSync(srcPath, destPath, { recursive: true });
      }
    }

    // Get git commit hash for version
    let version: string | undefined;
    try {
      const gitPath = getGitPath();
      const { stdout } = await execAsync(`"${gitPath}" rev-parse HEAD`, { cwd: tempDir });
      version = stdout.trim().substring(0, 7);
    } catch {
      // Ignore if git command fails
    }

    // Save source metadata
    const sourceMetadata: SkillSource = {
      type: 'git',
      url: gitUrl,
      version,
      installedAt: new Date().toISOString(),
    };
    saveSourceMetadata(destDir, sourceMetadata);

    // Load and return skill
    const loadedSkill = loadSkill(workspaceRoot, slug);
    if (!loadedSkill) {
      throw new Error('Failed to load imported skill');
    }

    return loadedSkill;
  } finally {
    // Cleanup temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * Import single SKILL.md file
 */
export async function importSkillFromFile(
  workspaceRoot: string,
  filePath: string,
  suggestedSlug?: string
): Promise<LoadedSkill> {
  // Validate file exists
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Validate file is SKILL.md (case-insensitive)
  const fileName = basename(filePath);
  if (fileName.toLowerCase() !== 'skill.md') {
    throw new Error('File must be named SKILL.md (case-insensitive)');
  }

  // Read file content to validate
  const content = readFileSync(filePath, 'utf-8');
  if (!content.includes('---')) {
    throw new Error('SKILL.md must contain YAML frontmatter');
  }

  // Determine slug
  const baseSlug = suggestedSlug || extractSlugFromPath(filePath);
  const slug = resolveSlugConflict(workspaceRoot, baseSlug);

  // Create skill directory
  const skillsDir = getWorkspaceSkillsPath(workspaceRoot);
  const destDir = join(skillsDir, slug);
  mkdirSync(destDir, { recursive: true });

  // Copy SKILL.md
  const destFile = join(destDir, 'SKILL.md');
  writeFileSync(destFile, content, 'utf-8');

  // Save source metadata
  const sourceMetadata: SkillSource = {
    type: 'file',
    installedAt: new Date().toISOString(),
  };
  saveSourceMetadata(destDir, sourceMetadata);

  // Load and return skill
  const loadedSkill = loadSkill(workspaceRoot, slug);
  if (!loadedSkill) {
    throw new Error('Failed to load imported skill');
  }

  return loadedSkill;
}

/**
 * Import skill from URL (skills.sh, GitHub, or direct download)
 */
export async function importSkillFromUrl(
  workspaceRoot: string,
  url: string,
  catalogEntry?: SkillCatalogEntry
): Promise<LoadedSkill> {
  const trimmedUrl = url.trim();

  // Handle GitHub tree/blob URLs (e.g., https://github.com/user/repo/tree/main/path/to/skill)
  const githubTreeMatch = trimmedUrl.match(
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/(tree|blob)\/([^\/]+)\/(.+)$/
  );

  if (githubTreeMatch) {
    const [, owner, repo, , branch, path] = githubTreeMatch;

    // Type guard: these values are guaranteed to exist due to the regex match
    if (!owner || !repo || !branch || !path) {
      throw new Error('Invalid GitHub tree URL format');
    }

    // Clone the entire repo and extract the subdirectory
    const tempDir = createTempDir();
    const repoUrl = `https://github.com/${owner}/${repo}.git`;

    try {
      // Clone repository
      const gitPath = getGitPath();
      const cloneCommand = `"${gitPath}" clone -b ${branch} --depth 1 "${repoUrl}" "${tempDir}"`;

      try {
        await execAsync(cloneCommand);
      } catch (gitError: any) {
        throw new Error(`Failed to clone repository: ${gitError.message || String(gitError)}`);
      }

      // Navigate to the subdirectory
      const skillDir = join(tempDir, path);

      if (!existsSync(skillDir)) {
        throw new Error(`Path not found in repository: ${path}`);
      }

      if (!validateSkillDirectory(skillDir)) {
        throw new Error(`No valid SKILL.md found at: ${path}`);
      }

      // Import from the subdirectory
      return await importSkillFromFolder(workspaceRoot, skillDir, {
        type: 'git',
        url: trimmedUrl,
      });
    } finally {
      // Cleanup temp directory
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }

  // Handle regular Git URLs
  if (trimmedUrl.match(/^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/) ||
      trimmedUrl.match(/^git@.+:.+/) ||
      trimmedUrl.endsWith('.git')) {
    return await importSkillFromGit(workspaceRoot, trimmedUrl);
  }

  // Handle direct file downloads
  const tempDir = createTempDir();

  try {
    // Download file
    let response;
    try {
      response = await fetch(trimmedUrl);
    } catch (fetchError: any) {
      throw new Error(`Failed to fetch URL: ${fetchError.message || String(fetchError)}`);
    }

    if (!response.ok) {
      throw new Error(`Failed to download from URL: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const buffer = Buffer.from(await response.arrayBuffer());

    // Determine file type and handle accordingly
    if (contentType.includes('application/zip') || trimmedUrl.endsWith('.zip')) {
      // Save as ZIP and import
      const zipPath = join(tempDir, 'skill.zip');
      writeFileSync(zipPath, buffer);

      return await importSkillFromZip(workspaceRoot, zipPath, {
        type: 'skillssh',
        url: trimmedUrl,
        version: catalogEntry?.version,
      });
    } else if (contentType.includes('text/markdown') || trimmedUrl.endsWith('.md')) {
      // Save as SKILL.md and import
      const mdPath = join(tempDir, 'SKILL.md');
      writeFileSync(mdPath, buffer);

      return await importSkillFromFile(workspaceRoot, mdPath, catalogEntry?.slug);
    } else {
      throw new Error(`Unsupported file type. Expected ZIP, Markdown file, or Git repository. Got content-type: ${contentType}`);
    }
  } finally {
    // Cleanup temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}
