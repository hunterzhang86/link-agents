/**
 * Centralized path configuration for Link Agents.
 *
 * Supports multi-instance development via LINK_CONFIG_DIR environment variable.
 * When running from a numbered folder (e.g., link-agents-1), the detect-instance.sh
 * script sets LINK_CONFIG_DIR to ~/.link-agents-1, allowing multiple instances to run
 * simultaneously with separate configurations.
 *
 * Default (non-numbered folders): ~/.link-agents/
 * Instance 1 (-1 suffix): ~/.link-agents-1/
 * Instance 2 (-2 suffix): ~/.link-agents-2/
 */

import { homedir } from 'os';
import { join } from 'path';

// Allow override via environment variable for multi-instance dev
// Falls back to default ~/.link-agents/ for production and non-numbered dev folders
export const CONFIG_DIR = process.env.LINK_CONFIG_DIR || join(homedir(), '.link-agents');
