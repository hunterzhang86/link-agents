/**
 * @link-agents/shared
 *
 * Shared business logic for Link Agent.
 * Used by the Electron app.
 *
 * Import specific modules via subpath exports:
 *   import { LinkAgent } from '@link-agents/shared/agent';
 *   import { loadStoredConfig } from '@link-agents/shared/config';
 *   import { getCredentialManager } from '@link-agents/shared/credentials';
 *   import { CraftMcpClient } from '@link-agents/shared/mcp';
 *   import { debug } from '@link-agents/shared/utils';
 *   import { loadSource, createSource, getSourceCredentialManager } from '@link-agents/shared/sources';
 *   import { createWorkspace, loadWorkspace } from '@link-agents/shared/workspaces';
 *
 * Available modules:
 *   - agent: LinkAgent SDK wrapper, plan tools
 *   - auth: OAuth, token management, auth state
 *   - clients: Craft API client
 *   - config: Storage, models, preferences
 *   - credentials: Encrypted credential storage
 *   - headless: Non-interactive execution mode
 *   - mcp: MCP client, connection validation
 *   - prompts: System prompt generation
 *   - sources: Workspace-scoped source management (MCP, API, local)
 *   - utils: Debug logging, file handling, summarization
 *   - validation: URL validation
 *   - version: Version and installation management
 *   - workspaces: Workspace management (top-level organizational unit)
 */

// Export branding (standalone, no dependencies)
export * from './branding.ts';
