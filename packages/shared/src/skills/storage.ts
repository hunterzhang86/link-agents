/**
 * Skills Storage
 *
 * CRUD operations for workspace skills.
 * Skills are stored in {workspace}/skills/{slug}/ directories.
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import type { LoadedSkill, SkillMetadata, SkillSource } from './types.ts';
import { getWorkspaceSkillsPath } from '../workspaces/storage.ts';
import {
  validateIconValue,
  findIconFile,
  downloadIcon,
  needsIconDownload,
  isIconUrl,
} from '../utils/icon.ts';

// ============================================================
// Parsing
// ============================================================

/**
 * Parse SKILL.md content and extract frontmatter + body
 */
function parseSkillFile(content: string): { metadata: SkillMetadata; body: string } | null {
  try {
    const parsed = matter(content);

    // Validate required fields
    if (!parsed.data.name || !parsed.data.description) {
      return null;
    }

    // Validate and extract optional icon field
    // Only accepts emoji or URL - rejects inline SVG and relative paths
    const icon = validateIconValue(parsed.data.icon, 'Skills');

    return {
      metadata: {
        name: parsed.data.name as string,
        description: parsed.data.description as string,
        globs: parsed.data.globs as string[] | undefined,
        alwaysAllow: parsed.data.alwaysAllow as string[] | undefined,
        icon,
      },
      body: parsed.content,
    };
  } catch {
    return null;
  }
}

// ============================================================
// Load Operations
// ============================================================

/**
 * Load a single skill from a workspace
 * @param workspaceRoot - Absolute path to workspace root
 * @param slug - Skill directory name
 */
export function loadSkill(workspaceRoot: string, slug: string): LoadedSkill | null {
  const skillsDir = getWorkspaceSkillsPath(workspaceRoot);
  const skillDir = join(skillsDir, slug);
  const skillFile = join(skillDir, 'SKILL.md');

  // Check directory exists
  if (!existsSync(skillDir) || !statSync(skillDir).isDirectory()) {
    return null;
  }

  // Check SKILL.md exists
  if (!existsSync(skillFile)) {
    return null;
  }

  // Read and parse SKILL.md
  let content: string;
  try {
    content = readFileSync(skillFile, 'utf-8');
  } catch {
    return null;
  }

  const parsed = parseSkillFile(content);
  if (!parsed) {
    return null;
  }

  // Load source metadata if exists
  const sourceFile = join(skillDir, '.source.json');
  let source: SkillSource | undefined;
  if (existsSync(sourceFile)) {
    try {
      const sourceContent = readFileSync(sourceFile, 'utf-8');
      source = JSON.parse(sourceContent) as SkillSource;
    } catch {
      // Ignore invalid source file
    }
  }

  return {
    slug,
    metadata: parsed.metadata,
    content: parsed.body,
    iconPath: findIconFile(skillDir),
    path: skillDir,
    source,
  };
}

/**
 * Load all skills from a workspace
 * @param workspaceRoot - Absolute path to workspace root
 */
export function loadWorkspaceSkills(workspaceRoot: string): LoadedSkill[] {
  const skillsDir = getWorkspaceSkillsPath(workspaceRoot);

  if (!existsSync(skillsDir)) {
    return [];
  }

  const skills: LoadedSkill[] = [];

  try {
    const entries = readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skill = loadSkill(workspaceRoot, entry.name);
      if (skill) {
        skills.push(skill);
      }
    }
  } catch {
    // Ignore errors reading skills directory
  }

  return skills;
}

/**
 * Get icon path for a skill
 * @param workspaceRoot - Absolute path to workspace root
 * @param slug - Skill directory name
 */
export function getSkillIconPath(workspaceRoot: string, slug: string): string | null {
  const skillsDir = getWorkspaceSkillsPath(workspaceRoot);
  const skillDir = join(skillsDir, slug);

  if (!existsSync(skillDir)) {
    return null;
  }

  return findIconFile(skillDir) || null;
}

// ============================================================
// Update Operations
// ============================================================

/**
 * Update skill metadata and content
 * @param workspaceRoot - Absolute path to workspace root
 * @param slug - Skill directory name (immutable)
 * @param metadata - Updated metadata
 * @param content - Updated markdown content
 */
export function updateSkill(
  workspaceRoot: string,
  slug: string,
  metadata: SkillMetadata,
  content: string
): LoadedSkill | null {
  const skillsDir = getWorkspaceSkillsPath(workspaceRoot);
  const skillDir = join(skillsDir, slug);
  const skillFile = join(skillDir, 'SKILL.md');

  // Validate skill exists
  if (!existsSync(skillDir) || !existsSync(skillFile)) {
    return null;
  }

  // Validate metadata
  if (!metadata.name || !metadata.description) {
    throw new Error('Name and description are required');
  }

  // Validate icon if provided
  const validatedIcon = validateIconValue(metadata.icon, 'Skills');

  // Build SKILL.md content with frontmatter
  const frontmatter = {
    name: metadata.name,
    description: metadata.description,
    ...(metadata.globs && { globs: metadata.globs }),
    ...(metadata.alwaysAllow && { alwaysAllow: metadata.alwaysAllow }),
    ...(validatedIcon && { icon: validatedIcon }),
  };

  const yamlContent = matter.stringify(content, frontmatter);

  // Write updated SKILL.md
  writeFileSync(skillFile, yamlContent, 'utf-8');

  // Update .source.json to mark as modified
  const sourceFile = join(skillDir, '.source.json');
  if (existsSync(sourceFile)) {
    try {
      const sourceContent = readFileSync(sourceFile, 'utf-8');
      const source = JSON.parse(sourceContent) as SkillSource;
      source.modified = true;
      writeFileSync(sourceFile, JSON.stringify(source, null, 2), 'utf-8');
    } catch {
      // If source file is invalid, create new one marking as modified
      const source: SkillSource = {
        type: 'local',
        modified: true,
        installedAt: new Date().toISOString(),
      };
      writeFileSync(sourceFile, JSON.stringify(source, null, 2), 'utf-8');
    }
  } else {
    // No source file exists, create one
    const source: SkillSource = {
      type: 'local',
      modified: true,
      installedAt: new Date().toISOString(),
    };
    writeFileSync(sourceFile, JSON.stringify(source, null, 2), 'utf-8');
  }

  // Reload and return updated skill
  return loadSkill(workspaceRoot, slug);
}

// ============================================================
// Delete Operations
// ============================================================

/**
 * Delete a skill from a workspace
 * @param workspaceRoot - Absolute path to workspace root
 * @param slug - Skill directory name
 */
export function deleteSkill(workspaceRoot: string, slug: string): boolean {
  const skillsDir = getWorkspaceSkillsPath(workspaceRoot);
  const skillDir = join(skillsDir, slug);

  if (!existsSync(skillDir)) {
    return false;
  }

  try {
    rmSync(skillDir, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Check if a skill exists in a workspace
 * @param workspaceRoot - Absolute path to workspace root
 * @param slug - Skill directory name
 */
export function skillExists(workspaceRoot: string, slug: string): boolean {
  const skillsDir = getWorkspaceSkillsPath(workspaceRoot);
  const skillDir = join(skillsDir, slug);
  const skillFile = join(skillDir, 'SKILL.md');

  return existsSync(skillDir) && existsSync(skillFile);
}

/**
 * List skill slugs in a workspace
 * @param workspaceRoot - Absolute path to workspace root
 */
export function listSkillSlugs(workspaceRoot: string): string[] {
  const skillsDir = getWorkspaceSkillsPath(workspaceRoot);

  if (!existsSync(skillsDir)) {
    return [];
  }

  try {
    return readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => {
        if (!entry.isDirectory()) return false;
        const skillFile = join(skillsDir, entry.name, 'SKILL.md');
        return existsSync(skillFile);
      })
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

// ============================================================
// Icon Download (uses shared utilities)
// ============================================================

/**
 * Download an icon from a URL and save it to the skill directory.
 * Returns the path to the downloaded icon, or null on failure.
 */
export async function downloadSkillIcon(
  skillDir: string,
  iconUrl: string
): Promise<string | null> {
  return downloadIcon(skillDir, iconUrl, 'Skills');
}

/**
 * Check if a skill needs its icon downloaded.
 * Returns true if metadata has a URL icon and no local icon file exists.
 */
export function skillNeedsIconDownload(skill: LoadedSkill): boolean {
  return needsIconDownload(skill.metadata.icon, skill.iconPath);
}

// Re-export icon utilities for convenience
export { isIconUrl } from '../utils/icon.ts';

// ============================================================
// Source Metadata
// ============================================================

/**
 * Save source metadata to .source.json
 * @param workspaceRoot - Absolute path to workspace root
 * @param slug - Skill directory name
 * @param source - Source metadata to save
 */
export function saveSkillSource(
  workspaceRoot: string,
  slug: string,
  source: SkillSource
): void {
  const skillsDir = getWorkspaceSkillsPath(workspaceRoot);
  const sourceFile = join(skillsDir, slug, '.source.json');
  writeFileSync(sourceFile, JSON.stringify(source, null, 2), 'utf-8');
}

