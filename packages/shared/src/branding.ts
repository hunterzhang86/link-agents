/**
 * Centralized branding assets for Link Agents
 * Used by OAuth callback pages
 */

export const LINK_AGENTS_LOGO = [
  '██      ██ ███    ██ ██   ██     █████   ██████  ███████ ███    ██ ████████ ███████',
  '██      ██ ████   ██ ██  ██     ██   ██ ██       ██      ████   ██    ██    ██     ',
  '██      ██ ██ ██  ██ █████      ███████ ██   ███ █████   ██ ██  ██    ██    ███████',
  '██      ██ ██  ██ ██ ██  ██     ██   ██ ██    ██ ██      ██  ██ ██    ██         ██',
  '███████ ██ ██   ████ ██   ██    ██   ██  ██████  ███████ ██   ████    ██    ███████',
] as const;

/** Logo as a single string for HTML templates */
export const LINK_AGENTS_LOGO_HTML = LINK_AGENTS_LOGO.map((line) => line.trimEnd()).join('\n');

/** Session viewer base URL */
export const VIEWER_URL = 'https://linkagents.dev';
