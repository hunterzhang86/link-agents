/**
 * Claude Code Session Reader
 *
 * Reads Claude Code sessions from ~/.claude/ directory.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type {
  ClaudeCodeHistoryEntry,
  ClaudeCodeSession,
  ClaudeCodeSessionMetadata,
  ClaudeCodeTranscriptLine,
} from './claude-code-types.ts';

const getClaudeConfigDir = (): string =>
  process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

export class ClaudeCodeSessionReader {
  private historyPath: string;
  private projectsDir: string;

  constructor() {
    const claudeDir = getClaudeConfigDir();
    this.historyPath = path.join(claudeDir, 'history.jsonl');
    this.projectsDir = path.join(claudeDir, 'projects');
  }

  /**
   * List all Claude Code sessions
   */
  async listSessions(): Promise<ClaudeCodeSessionMetadata[]> {
    try {
      // Check if history file exists
      if (!fs.existsSync(this.historyPath)) {
        return [];
      }

      // Read history.jsonl
      const historyContent = await fs.promises.readFile(this.historyPath, 'utf-8');
      const historyLines = historyContent
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as ClaudeCodeHistoryEntry);

      // Group by sessionId
      const sessionMap = new Map<string, ClaudeCodeHistoryEntry[]>();
      for (const entry of historyLines) {
        if (!sessionMap.has(entry.sessionId)) {
          sessionMap.set(entry.sessionId, []);
        }
        sessionMap.get(entry.sessionId)!.push(entry);
      }

      // Build session metadata
      const sessions: ClaudeCodeSessionMetadata[] = [];
      for (const [sessionId, entries] of sessionMap.entries()) {
        // Sort by timestamp
        entries.sort((a, b) => a.timestamp - b.timestamp);

        const firstEntry = entries[0];
        const lastEntry = entries[entries.length - 1];

        if (!firstEntry || !lastEntry) {
          continue;
        }

        // Find transcript file
        const transcriptPath = await this.findTranscriptFile(sessionId);

        // Extract token usage if transcript exists
        let tokenUsage;
        let messageCount = entries.length;
        if (transcriptPath) {
          const transcriptData = await this.readTranscriptMetadata(transcriptPath);
          tokenUsage = transcriptData.tokenUsage;
          messageCount = transcriptData.messageCount;
        }

        sessions.push({
          id: sessionId,
          sessionId,
          project: firstEntry.project,
          projectPath: firstEntry.project,
          createdAt: firstEntry.timestamp,
          lastUsedAt: lastEntry.timestamp,
          messageCount,
          preview: firstEntry.display.slice(0, 150),
          transcriptPath: transcriptPath || undefined,
          tokenUsage,
        });
      }

      // Sort by lastUsedAt (most recent first)
      sessions.sort((a, b) => b.lastUsedAt - a.lastUsedAt);

      return sessions;
    } catch (error) {
      console.error('Error listing Claude Code sessions:', error);
      return [];
    }
  }

  /**
   * Load a complete session with all messages
   */
  async loadSession(sessionId: string): Promise<ClaudeCodeSession | null> {
    try {
      // Find transcript file
      const transcriptPath = await this.findTranscriptFile(sessionId);
      if (!transcriptPath) {
        console.warn(`Transcript not found for session ${sessionId}`);
        return null;
      }

      // Read transcript
      const transcriptContent = await fs.promises.readFile(transcriptPath, 'utf-8');
      const messages = transcriptContent
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as ClaudeCodeTranscriptLine)
        .filter((line) => line.type === 'user' || line.type === 'assistant');

      // Get metadata from history
      const sessions = await this.listSessions();
      const metadata = sessions.find((s) => s.sessionId === sessionId);

      if (!metadata) {
        console.warn(`Metadata not found for session ${sessionId}`);
        return null;
      }

      return {
        metadata,
        messages,
      };
    } catch (error) {
      console.error(`Error loading session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Find transcript file for a session
   */
  private async findTranscriptFile(sessionId: string): Promise<string | null> {
    try {
      if (!fs.existsSync(this.projectsDir)) {
        return null;
      }

      // List all project directories
      const projectDirs = await fs.promises.readdir(this.projectsDir);

      // Search for {sessionId}.jsonl in each project directory
      for (const projectDir of projectDirs) {
        const projectPath = path.join(this.projectsDir, projectDir);
        const stat = await fs.promises.stat(projectPath);

        if (stat.isDirectory()) {
          const transcriptPath = path.join(projectPath, `${sessionId}.jsonl`);
          if (fs.existsSync(transcriptPath)) {
            return transcriptPath;
          }
        }
      }

      return null;
    } catch (error) {
      console.error(`Error finding transcript for session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Read transcript metadata without loading all messages
   */
  private async readTranscriptMetadata(transcriptPath: string): Promise<{
    messageCount: number;
    tokenUsage?: {
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      cacheCreationTokens: number;
    };
  }> {
    try {
      const content = await fs.promises.readFile(transcriptPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      let inputTokens = 0;
      let outputTokens = 0;
      let cacheReadTokens = 0;
      let cacheCreationTokens = 0;
      let messageCount = 0;

      for (const line of lines) {
        const data = JSON.parse(line) as ClaudeCodeTranscriptLine;
        if (data.type === 'user' || data.type === 'assistant') {
          messageCount++;

          if (data.message.usage) {
            inputTokens += data.message.usage.input_tokens || 0;
            outputTokens += data.message.usage.output_tokens || 0;
            cacheReadTokens += data.message.usage.cache_read_input_tokens || 0;
            cacheCreationTokens += data.message.usage.cache_creation_input_tokens || 0;
          }
        }
      }

      return {
        messageCount,
        tokenUsage: {
          inputTokens,
          outputTokens,
          cacheReadTokens,
          cacheCreationTokens,
        },
      };
    } catch (error) {
      console.error('Error reading transcript metadata:', error);
      return { messageCount: 0 };
    }
  }
}
