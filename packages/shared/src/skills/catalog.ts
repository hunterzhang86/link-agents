/**
 * Skills Catalog
 *
 * Functions for fetching and caching skills from GitHub repository.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import type { SkillCatalog, SkillCatalogEntry } from './types.ts';

const CATALOG_CACHE_PATH = join(homedir(), '.link-agents', 'skills-catalog.json');
const DEFAULT_CATALOG_TTL = 1000 * 60 * 60 * 24; // 24 hours
const DEFAULT_GITHUB_SKILLS_REPO = 'https://github.com/anthropics/skills';
const DEFAULT_GITHUB_API_BASE = 'https://api.github.com/repos/anthropics/skills';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds

// ============================================================
// Utility Functions
// ============================================================

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
  // Add jitter (±25%)
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Fetch with retry and exponential backoff
 * Handles rate limiting (403/429) and network errors
 */
async function fetchWithRetry(url: string, attempt = 0): Promise<Response> {
  try {
    const response = await fetch(url);

    // Check for rate limiting
    if (response.status === 403 || response.status === 429) {
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');

      // If we've hit the rate limit and have retries left
      if (attempt < MAX_RETRIES) {
        let waitTime: number;

        if (rateLimitReset) {
          // Wait until rate limit resets (with a small buffer)
          const resetTime = parseInt(rateLimitReset, 10) * 1000;
          waitTime = Math.max(resetTime - Date.now() + 1000, 0);
          // Cap wait time to max retry delay
          waitTime = Math.min(waitTime, MAX_RETRY_DELAY);
        } else {
          // Use exponential backoff
          waitTime = calculateBackoffDelay(attempt);
        }

        console.warn(
          `Rate limited (${response.status}). Retrying in ${Math.round(waitTime / 1000)}s... (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await sleep(waitTime);
        return fetchWithRetry(url, attempt + 1);
      }

      throw new Error(
        `GitHub API rate limit exceeded. ${rateLimitRemaining === '0' ? 'Please try again later.' : 'Status: ' + response.status}`
      );
    }

    // For other non-OK responses, retry with backoff
    if (!response.ok && attempt < MAX_RETRIES) {
      const waitTime = calculateBackoffDelay(attempt);
      console.warn(
        `Request failed (${response.status}). Retrying in ${Math.round(waitTime / 1000)}s... (attempt ${attempt + 1}/${MAX_RETRIES})`
      );
      await sleep(waitTime);
      return fetchWithRetry(url, attempt + 1);
    }

    return response;
  } catch (error) {
    // Network errors - retry with backoff
    if (attempt < MAX_RETRIES) {
      const waitTime = calculateBackoffDelay(attempt);
      console.warn(
        `Network error: ${error}. Retrying in ${Math.round(waitTime / 1000)}s... (attempt ${attempt + 1}/${MAX_RETRIES})`
      );
      await sleep(waitTime);
      return fetchWithRetry(url, attempt + 1);
    }
    throw error;
  }
}

/**
 * Parse GitHub repository URL to extract owner and repo
 */
function parseGitHubUrl(url: string): { owner: string; repo: string; apiBase: string } | null {
  // Support both https://github.com/owner/repo and https://api.github.com/repos/owner/repo formats
  const githubMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (githubMatch) {
    const owner = githubMatch[1];
    const repo = githubMatch[2]?.replace(/\.git$/, '');
    return {
      owner,
      repo: repo ?? '',
      apiBase: `https://api.github.com/repos/${owner}/${repo}`,
    };
  }
  return null;
}

// ============================================================
// Catalog Functions
// ============================================================

/**
 * Fetch catalog from GitHub repository
 *
 * Fetches the skills directory from a GitHub repository
 * and parses each skill's SKILL.md to build the catalog.
 *
 * @param marketplaceUrl - Custom marketplace URL (defaults to anthropics/skills)
 * @param cacheTTL - Cache TTL in milliseconds (defaults to 24 hours)
 */
export async function fetchSkillsCatalog(
  marketplaceUrl: string = DEFAULT_GITHUB_SKILLS_REPO,
  cacheTTL: number = DEFAULT_CATALOG_TTL
): Promise<SkillCatalog> {
  try {
    // Parse the GitHub URL
    const parsed = parseGitHubUrl(marketplaceUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${marketplaceUrl}`);
    }

    const { apiBase } = parsed;

    // Fetch the skills directory from GitHub API
    const response = await fetchWithRetry(`${apiBase}/contents/skills`);

    if (!response.ok) {
      throw new Error(`Failed to fetch skills directory: ${response.statusText}`);
    }

    const contents = (await response.json()) as Array<{
      name: string;
      type: string;
      sha?: string;
    }>;

    // Filter for directories only (GitHub API returns type: "dir")
    const skillDirs = contents.filter((item) => item.type === 'dir');

    // Fetch metadata for each skill
    const skillPromises = skillDirs.map(async (dir) => {
      try {
        // Fetch SKILL.md from each skill directory
        const skillMdResponse = await fetchWithRetry(`${apiBase}/contents/skills/${dir.name}/SKILL.md`);

        if (!skillMdResponse.ok) {
          return null; // Skip if SKILL.md doesn't exist
        }

        const skillMdData = (await skillMdResponse.json()) as {
          content: string;
          sha?: string;
        };

        // Decode base64 content
        const content = Buffer.from(skillMdData.content, 'base64').toString('utf-8');

        // Parse YAML frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) {
          return null; // Skip if no frontmatter
        }

        // Simple YAML parsing for name and description
        const frontmatter = frontmatterMatch[1];
        if (!frontmatter) {
          return null;
        }

        const nameMatch = frontmatter.match(/name:\s*(.+)/);
        const descMatch = frontmatter.match(/description:\s*["']?([^"'\n]+)["']?/);
        const authorMatch = frontmatter.match(/author:\s*(.+)/);
        const versionMatch = frontmatter.match(/version:\s*(.+)/);

        // Use dir.name as slug, convert to friendly display name
        const slug = dir.name;
        const rawName = nameMatch?.[1]?.trim().replace(/^["']|["']$/g, '') ?? dir.name;

        // Convert slug to display name (e.g., "algorithmic-art" -> "Algorithmic Art")
        const displayName = rawName
          .split('-')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        const description = descMatch?.[1]?.trim() ?? '';
        const author = authorMatch?.[1]?.trim().replace(/^["']|["']$/g, '') ?? 'Anthropic';
        const version = versionMatch?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '1.0.0';

        const entry: SkillCatalogEntry = {
          slug,
          name: displayName,
          description,
          author,
          version,
          downloadUrl: `${marketplaceUrl}/tree/main/skills/${dir.name}`,
          tags: ['github', 'anthropic'],
          lastUpdated: skillMdData.sha ? new Date().toISOString() : undefined,
        };

        return entry;
      } catch (error) {
        console.error(`Failed to fetch skill ${dir.name}:`, error);
        return null;
      }
    });

    const skillsResults = await Promise.all(skillPromises);
    const skills = skillsResults.filter((s): s is SkillCatalogEntry => s !== null);

    const catalog: SkillCatalog = {
      skills,
      lastFetched: new Date().toISOString(),
    };

    // Cache locally
    const cacheDir = dirname(CATALOG_CACHE_PATH);
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }
    writeFileSync(CATALOG_CACHE_PATH, JSON.stringify(catalog, null, 2), 'utf-8');

    return catalog;
  } catch (error) {
    throw new Error(`Failed to fetch skills catalog: ${String(error)}`);
  }
}

/**
 * Load cached catalog
 *
 * @param cacheTTL - Cache TTL in milliseconds (defaults to 24 hours)
 */
export function loadCachedCatalog(cacheTTL: number = DEFAULT_CATALOG_TTL): SkillCatalog | null {
  if (!existsSync(CATALOG_CACHE_PATH)) {
    return null;
  }

  try {
    const content = readFileSync(CATALOG_CACHE_PATH, 'utf-8');
    const cached = JSON.parse(content) as SkillCatalog;

    // Check if cache is expired
    const age = Date.now() - new Date(cached.lastFetched).getTime();
    if (age > cacheTTL) {
      return null; // Expired
    }

    return cached;
  } catch {
    return null;
  }
}

/**
 * Get catalog (cached or fresh)
 *
 * @param forceRefresh - Force refresh from remote
 * @param marketplaceUrl - Custom marketplace URL (defaults to anthropics/skills)
 * @param cacheTTL - Cache TTL in milliseconds (defaults to 24 hours)
 */
export async function getSkillsCatalog(
  forceRefresh = false,
  marketplaceUrl: string = DEFAULT_GITHUB_SKILLS_REPO,
  cacheTTL: number = DEFAULT_CATALOG_TTL
): Promise<SkillCatalog> {
  if (!forceRefresh) {
    const cached = loadCachedCatalog(cacheTTL);
    if (cached) {
      return cached;
    }
  }

  return fetchSkillsCatalog(marketplaceUrl, cacheTTL);
}
