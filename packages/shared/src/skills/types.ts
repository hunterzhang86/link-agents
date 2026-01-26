/**
 * Skills Types
 *
 * Type definitions for workspace skills.
 * Skills are specialized instructions that extend Claude's capabilities.
 */

/**
 * Skill metadata from SKILL.md YAML frontmatter
 */
export interface SkillMetadata {
  /** Display name for the skill */
  name: string;
  /** Brief description shown in skill list */
  description: string;
  /** Optional file patterns that trigger this skill */
  globs?: string[];
  /** Optional tools to always allow when skill is active */
  alwaysAllow?: string[];
  /**
   * Optional icon - emoji or URL only.
   * - Emoji: rendered directly in UI (e.g., "🔧")
   * - URL: auto-downloaded to icon.{ext} file
   * Note: Relative paths and inline SVG are NOT supported.
   */
  icon?: string;
}

/**
 * Skill source type - where the skill was imported from
 */
export type SkillSourceType = 'local' | 'skillssh' | 'git' | 'zip' | 'folder' | 'file';

/**
 * Skill source metadata for tracking origin and updates
 */
export interface SkillSource {
  /** Type of source */
  type: SkillSourceType;
  /** Original URL for git/skillssh/zip sources */
  url?: string;
  /** Version from skills.sh or git tag */
  version?: string;
  /** ISO timestamp of last update check */
  lastChecked?: string;
  /** True if newer version exists */
  updateAvailable?: boolean;
  /** ISO timestamp of installation */
  installedAt?: string;
  /** True if user has edited the skill */
  modified?: boolean;
}

/**
 * A loaded skill with parsed content
 */
export interface LoadedSkill {
  /** Directory name (slug) */
  slug: string;
  /** Parsed metadata from YAML frontmatter */
  metadata: SkillMetadata;
  /** Full SKILL.md content (without frontmatter) */
  content: string;
  /** Absolute path to icon file if exists */
  iconPath?: string;
  /** Absolute path to skill directory */
  path: string;
  /** Source metadata for tracking origin and updates */
  source?: SkillSource;
}

/**
 * Skill catalog entry from skills.sh
 */
export interface SkillCatalogEntry {
  /** Skill slug identifier */
  slug: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Author name */
  author?: string;
  /** Version string */
  version?: string;
  /** URL to download skill */
  downloadUrl: string;
  /** Icon URL */
  iconUrl?: string;
  /** Category tags */
  tags?: string[];
  /** Download count */
  downloads?: number;
  /** Last updated timestamp */
  lastUpdated?: string;
}

/**
 * Skills catalog from skills.sh
 */
export interface SkillCatalog {
  /** List of available skills */
  skills: SkillCatalogEntry[];
  /** ISO timestamp when catalog was fetched */
  lastFetched: string;
}
