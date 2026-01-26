/**
 * Skills Update Management
 *
 * Functions for checking and applying skill updates.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { LoadedSkill, SkillCatalog } from './types.ts';
import { importSkillFromUrl, importSkillFromGit } from './import.ts';
import { deleteSkill } from './storage.ts';
import { getGitPath } from '../utils/git-path.ts';

const execAsync = promisify(exec);

// ============================================================
// Update Functions
// ============================================================

/**
 * Check if skill has updates available
 */
export async function checkSkillUpdate(
  skill: LoadedSkill,
  catalog?: SkillCatalog
): Promise<boolean> {
  if (!skill.source) {
    return false;
  }

  try {
    switch (skill.source.type) {
      case 'skillssh': {
        // Check catalog for newer version
        if (!catalog) {
          return false;
        }
        const entry = catalog.skills.find((s) => s.slug === skill.slug);
        if (!entry) {
          return false;
        }
        // Compare versions
        return entry.version !== skill.source.version;
      }

      case 'git': {
        // Check git remote for updates
        if (!skill.source.url) {
          return false;
        }

        try {
          // Fetch remote HEAD commit
          const gitPath = getGitPath();
          const { stdout } = await execAsync(
            `"${gitPath}" ls-remote ${skill.source.url} HEAD`
          );
          const parts = stdout.trim().split('\t');
          const remoteCommit = parts[0]?.substring(0, 7);

          // Compare with local version
          if (!remoteCommit) {
            return false;
          }
          return remoteCommit !== skill.source.version;
        } catch {
          return false;
        }
      }

      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Update skill from source
 */
export async function updateSkill(
  workspaceRoot: string,
  skill: LoadedSkill,
  catalog?: SkillCatalog
): Promise<LoadedSkill> {
  if (!skill.source) {
    throw new Error('Skill has no source metadata');
  }

  if (!skill.source.url) {
    throw new Error('Skill has no update source URL');
  }

  const slug = skill.slug;

  try {
    // Delete existing skill
    deleteSkill(workspaceRoot, slug);

    // Re-import from original source
    let updatedSkill: LoadedSkill;

    switch (skill.source.type) {
      case 'skillssh': {
        // Find catalog entry
        const entry = catalog?.skills.find((s) => s.slug === slug);
        if (!entry) {
          throw new Error('Skill not found in catalog');
        }

        updatedSkill = await importSkillFromUrl(
          workspaceRoot,
          entry.downloadUrl,
          entry
        );
        break;
      }

      case 'git': {
        updatedSkill = await importSkillFromGit(workspaceRoot, skill.source.url);
        break;
      }

      default:
        throw new Error(`Cannot update skill from source type: ${skill.source.type}`);
    }

    return updatedSkill;
  } catch (error) {
    throw new Error(`Failed to update skill: ${String(error)}`);
  }
}

/**
 * Check all skills for updates
 */
export async function checkAllSkillUpdates(
  skills: LoadedSkill[],
  catalog?: SkillCatalog
): Promise<Map<string, boolean>> {
  const updates = new Map<string, boolean>();

  await Promise.all(
    skills.map(async (skill) => {
      const hasUpdate = await checkSkillUpdate(skill, catalog);
      updates.set(skill.slug, hasUpdate);
    })
  );

  return updates;
}
