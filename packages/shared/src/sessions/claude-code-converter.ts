/**
 * Claude Code Session Converter
 *
 * Converts Claude Code sessions to Link Agents format.
 */

import type {
  ClaudeCodeSession,
  ClaudeCodeTranscriptLine,
} from './claude-code-types.ts';
import type { StoredSession, SessionTokenUsage } from './types.ts';
import type { StoredMessage } from '@link-agents/core/types';

export class ClaudeCodeConverter {
  /**
   * Generate a session ID (YYMMDD-adjective-noun format)
   */
  private generateSessionId(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Simple random words
    const adjectives = ['swift', 'bright', 'calm', 'bold', 'wise', 'quick', 'cool', 'warm'];
    const nouns = ['river', 'mountain', 'forest', 'ocean', 'sky', 'lake', 'valley', 'peak'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${datePrefix}-${adjective}-${noun}`;
  }

  /**
   * Convert Claude Code session to Link Agents format
   */
  convertSession(
    claudeSession: ClaudeCodeSession,
    targetWorkspaceRootPath: string
  ): StoredSession {
    const { metadata, messages } = claudeSession;

    // Convert messages
    const convertedMessages: StoredMessage[] = [];
    for (const line of messages) {
      const message = this.convertMessage(line);
      if (message) {
        convertedMessages.push(message);
      }
    }

    // Calculate token usage
    const tokenUsage = this.calculateTokenUsage(messages);

    // Generate session name
    const name = this.generateSessionName(claudeSession);

    return {
      id: this.generateSessionId(),
      sdkSessionId: metadata.sessionId,
      workspaceRootPath: targetWorkspaceRootPath,
      name,
      createdAt: metadata.createdAt,
      lastUsedAt: metadata.lastUsedAt,
      messages: convertedMessages,
      tokenUsage,
      // Use first message's cwd as working directory
      workingDirectory: messages[0]?.cwd,
      sdkCwd: messages[0]?.cwd,
      // Default permission mode
      permissionMode: 'ask',
      // Default todo state
      todoState: 'todo',
    };
  }

  /**
   * Convert a single Claude Code message to Craft format
   */
  private convertMessage(line: ClaudeCodeTranscriptLine): StoredMessage | null {
    try {
      const { message, uuid, timestamp } = line;

      // Convert content blocks to text
      let textContent = '';

      // Handle both array and string content
      if (Array.isArray(message.content)) {
        for (const block of message.content) {
          if (block.type === 'text' && 'text' in block) {
            textContent += block.text;
          } else if (block.type === 'thinking' && 'text' in block) {
            textContent += `\n[Thinking: ${block.text}]\n`;
          }
        }
      } else if (typeof message.content === 'string') {
        textContent = message.content;
      }

      // Map role to MessageRole type ('user' | 'assistant')
      const messageType = message.role === 'user' ? 'user' : 'assistant';

      return {
        id: uuid,
        type: messageType,
        content: textContent,
        timestamp: new Date(timestamp).getTime(),
      };
    } catch (error) {
      console.error('Error converting message:', error);
      return null;
    }
  }

  /**
   * Calculate total token usage from messages
   */
  private calculateTokenUsage(messages: ClaudeCodeTranscriptLine[]): SessionTokenUsage {
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let cacheCreationTokens = 0;

    for (const line of messages) {
      if (line.message.usage) {
        inputTokens += line.message.usage.input_tokens || 0;
        outputTokens += line.message.usage.output_tokens || 0;
        cacheReadTokens += line.message.usage.cache_read_input_tokens || 0;
        cacheCreationTokens += line.message.usage.cache_creation_input_tokens || 0;
      }
    }

    const totalTokens = inputTokens + outputTokens;
    const contextTokens = inputTokens;

    // Rough cost estimation (Claude Sonnet 4.5 pricing)
    // Input: $3 per million tokens
    // Output: $15 per million tokens
    // Cache read: $0.30 per million tokens
    // Cache write: $3.75 per million tokens
    const costUsd =
      (inputTokens / 1_000_000) * 3 +
      (outputTokens / 1_000_000) * 15 +
      (cacheReadTokens / 1_000_000) * 0.3 +
      (cacheCreationTokens / 1_000_000) * 3.75;

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      contextTokens,
      costUsd,
      cacheReadTokens,
      cacheCreationTokens,
    };
  }

  /**
   * Generate a session name from Claude Code session
   */
  private generateSessionName(session: ClaudeCodeSession): string {
    const { metadata, messages } = session;

    // Try to get first user message
    const firstUserMessage = messages.find((m) => m.type === 'user');
    if (firstUserMessage) {
      const content = firstUserMessage.message.content;

      // Handle both array and string content
      if (Array.isArray(content)) {
        const textBlock = content.find((b) => b.type === 'text');
        if (textBlock && 'text' in textBlock) {
          const text = textBlock.text.trim();
          if (text) {
            return text.slice(0, 50) + (text.length > 50 ? '...' : '');
          }
        }
      } else if (typeof content === 'string') {
        const text = content.trim();
        if (text) {
          return text.slice(0, 50) + (text.length > 50 ? '...' : '');
        }
      }
    }

    // Fallback to project name
    const projectName = metadata.project.split('/').pop() || 'Unknown Project';
    return `Claude Code: ${projectName}`;
  }
}
