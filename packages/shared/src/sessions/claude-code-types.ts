/**
 * Claude Code Session Types
 *
 * Type definitions for reading and converting Claude Code sessions.
 */

/**
 * Claude Code transcript message content types
 */
export type ClaudeCodeContentBlock =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'tool_use';
      id: string;
      name: string;
      input: Record<string, any>;
    }
  | {
      type: 'tool_result';
      tool_use_id: string;
      content: string | Array<{ type: string; [key: string]: any }>;
      is_error?: boolean;
    }
  | {
      type: 'thinking';
      text: string;
    };

/**
 * Claude Code message structure
 */
export interface ClaudeCodeMessage {
  role: 'user' | 'assistant';
  content: ClaudeCodeContentBlock[];
  /** Optional message metadata (present in Claude Code transcripts) */
  id?: string;
  type?: 'message';
  model?: string;
  stop_reason?: string | null;
  stop_sequence?: string | null;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

/**
 * Claude Code transcript line (JSONL format)
 */
export interface ClaudeCodeTranscriptLine {
  parentUuid: string | null;
  isSidechain?: boolean;
  userType?: string;
  cwd: string;
  sessionId: string;
  version?: string;
  gitBranch?: string;
  type: 'user' | 'assistant' | 'file-history-snapshot';
  message: ClaudeCodeMessage;
  uuid: string;
  timestamp: string;
  isMeta?: boolean;
  thinkingMetadata?: {
    level: 'high' | 'medium' | 'low';
    disabled: boolean;
    triggers: string[];
  };
}

/**
 * Claude Code history entry (from history.jsonl)
 */
export interface ClaudeCodeHistoryEntry {
  display: string;
  pastedContents?: Record<string, any>;
  timestamp: number;
  project: string;
  sessionId: string;
}

/**
 * Claude Code session metadata
 */
export interface ClaudeCodeSessionMetadata {
  id: string;
  sessionId: string;
  project: string;
  projectPath: string;
  createdAt: number;
  lastUsedAt: number;
  messageCount: number;
  preview?: string;
  transcriptPath?: string;
  model?: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  };
}

/**
 * Complete Claude Code session with all messages
 */
export interface ClaudeCodeSession {
  metadata: ClaudeCodeSessionMetadata;
  messages: ClaudeCodeTranscriptLine[];
}

/**
 * Session change event types
 */
export type SessionChangeEventType = 'session-created' | 'session-updated' | 'session-deleted';

/**
 * Session change event
 */
export interface SessionChangeEvent {
  type: SessionChangeEventType;
  sessionId: string;
  timestamp: number;
}
