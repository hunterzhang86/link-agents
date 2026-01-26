/**
 * @link-agents/ui - Shared React UI components for Link Agent
 *
 * This package provides platform-agnostic UI components that work in both:
 * - Electron desktop app (full interactive mode)
 * - Web session viewer (read-only mode)
 *
 * Key components:
 * - SessionViewer: Read-only session transcript viewer (used by web viewer)
 * - TurnCard: Email-like display for assistant turns
 * - Markdown: Customizable markdown renderer with syntax highlighting
 *
 * Platform abstraction:
 * - PlatformProvider/usePlatform: Inject platform-specific actions
 */

// Context
export {
    PlatformProvider, ShikiThemeProvider, usePlatform, useShikiTheme, type PlatformActions,
    type PlatformProviderProps, type ShikiThemeProviderProps
} from './context'

// Chat components
export {
    FileTypeIcon, ResponseCard, SessionViewer, SystemMessage, TurnCard,
    TurnCardActionsMenu, UserMessageBubble, getFileTypeLabel, type ActivityItem, type FileTypeIconProps, type ResponseCardProps, type ResponseContent, type SessionViewerMode, type SessionViewerProps, type SystemMessageProps,
    type SystemMessageType, type TodoItem, type TurnCardActionsMenuProps, type TurnCardProps, type UserMessageBubbleProps
} from './components/chat'

// Markdown
export {
    CodeBlock, CollapsibleMarkdownProvider, InlineCode, Markdown,
    MemoizedMarkdown, useCollapsibleMarkdown,
    type MarkdownProps,
    type RenderMode
} from './components/markdown'

// UI primitives
export {
    PREVIEW_BADGE_VARIANTS, PreviewHeader,
    PreviewHeaderBadge, SimpleDropdown,
    SimpleDropdownItem, Spinner, type PreviewBadgeVariant, type PreviewHeaderBadgeProps, type PreviewHeaderProps, type SimpleDropdownItemProps, type SimpleDropdownProps, type SpinnerProps
} from './components/ui'

// Code viewer components
export {
    LANGUAGE_MAP, ShikiCodeViewer,
    ShikiDiffViewer, formatFilePath, getLanguageFromPath, truncateFilePath,
    type ShikiCodeViewerProps,
    type ShikiDiffViewerProps
} from './components/code-viewer'

// Terminal components
export {
    ANSI_COLORS, TerminalOutput, isGrepContentOutput, parseAnsi, parseGrepOutput, stripAnsi, type AnsiSpan,
    type GrepLine, type TerminalOutputProps,
    type ToolType
} from './components/terminal'

// Overlay components
export {
    // Specialized overlays
    CodePreviewOverlay, CopyButton, DataTableOverlay, DiffPreviewOverlay, DocumentFormattedMarkdownOverlay,
    // Base overlay components
    FullscreenOverlayBase, GenericOverlay,
    JSONPreviewOverlay, MultiDiffPreviewOverlay, PreviewOverlay, TerminalPreviewOverlay, detectLanguageFromPath, type BadgeVariant, type CodePreviewOverlayProps, type CopyButtonProps, type DataTableOverlayProps, type DiffPreviewOverlayProps, type DocumentFormattedMarkdownOverlayProps, type FileChange, type FullscreenOverlayBaseProps, type GenericOverlayProps,
    type JSONPreviewOverlayProps, type MultiDiffPreviewOverlayProps, type PreviewOverlayProps, type TerminalPreviewOverlayProps
} from './components/overlay'

// Utilities
export { cn } from './lib/utils'

// Layout constants and hooks
export {
    CHAT_CLASSES, CHAT_LAYOUT, OVERLAY_LAYOUT,
    useOverlayMode,
    type OverlayMode
} from './lib/layout'

// Tool result parsers
export {
    extractOverlayData, parseBashResult, parseGlobResult, parseGrepResult, parseReadResult, type BashResult, type CodeOverlayData,
    type DiffOverlayData, type GenericOverlayData, type GlobResult, type GrepResult, type JSONOverlayData,
    type OverlayData, type ReadResult, type TerminalOverlayData
} from './lib/tool-parsers'

// Turn utilities (pure functions)
export * from './components/chat/turn-utils'

// Icons
export {
    Icon_Folder,
    Icon_Inbox,
    type IconProps
} from './components/icons'

