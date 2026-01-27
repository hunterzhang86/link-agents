export * from './errors.ts';
export * from './link-agent.ts';
export * from './options.ts';

// Export session-scoped-tools - tools scoped to a specific session
export {
    cleanupSessionScopedTools, clearPlanFileState,
    // Tool factories (creates session-scoped tools)
    createSubmitPlanTool, getLastPlanFilePath,
    // Plan file management
    getSessionPlansDir,
    // Session-scoped tools provider
    getSessionScopedTools, isPathInPlansDir,
    // Callback registry for session-scoped tool notifications
    registerSessionScopedToolCallbacks,
    unregisterSessionScopedToolCallbacks,
    // Auth request types (unified auth flow)
    type AuthRequest,
    type AuthRequestType,
    type AuthResult,
    type CredentialAuthRequest, type CredentialInputMode, type GoogleOAuthAuthRequest, type McpOAuthAuthRequest, type MicrosoftOAuthAuthRequest,
    // Types
    type SessionScopedToolCallbacks, type SlackOAuthAuthRequest
} from './session-scoped-tools.ts';

// Export mode-manager - Centralized mode management
export {
    PERMISSION_MODE_CONFIG, PERMISSION_MODE_ORDER,
    // Default Explore mode patterns (for UI display)
    SAFE_MODE_CONFIG, blockWithReason, cleanupModeState, cyclePermissionMode, formatSessionState, getModeState,
    // Permission Mode API (primary)
    getPermissionMode,
    // Session state (lightweight per-message injection)
    getSessionState, initializeModeState,
    // Mode manager singleton (for advanced use cases)
    modeManager, setPermissionMode,
    // Tool blocking (centralized)
    shouldAllowToolInMode, subscribeModeChanges, type ModeCallbacks,
    type ModeConfig,
    // Types
    type ModeState, type PermissionMode
} from './mode-manager.ts';

// Export plan types and permission mode messages
export { PERMISSION_MODE_MESSAGES, PERMISSION_MODE_PROMPTS } from './plan-types.ts';
export type { Plan, PlanReviewRequest, PlanReviewResult, PlanState, PlanStep } from './plan-types.ts';

// Export thinking-levels - extended reasoning configuration
export {
    DEFAULT_THINKING_LEVEL, THINKING_LEVELS, getThinkingLevelName, getThinkingTokens, isValidThinkingLevel, type ThinkingLevel,
    type ThinkingLevelDefinition
} from './thinking-levels.ts';

// Export permissions-config - customizable permissions per workspace/source (permissions.json)
export {
    PermissionsConfigSchema, ensureDefaultPermissions,
    // App-level default permissions (at ~/.link-agents/permissions/)
    getAppPermissionsDir, getSourcePermissionsPath, getWorkspacePermissionsPath,
    // API endpoint checking
    isApiEndpointAllowed, loadDefaultPermissions, loadSourcePermissionsConfig,
    // Storage functions
    loadWorkspacePermissionsConfig,
    // Parser and validation
    parsePermissionsJson,
    // Cache singleton
    permissionsConfigCache, validatePermissionsConfig,
    // Types
    type ApiEndpointRule,
    type CompiledApiEndpointRule, type MergedPermissionsConfig, type PermissionsConfigFile, type PermissionsContext, type PermissionsCustomConfig
} from './permissions-config.ts';

