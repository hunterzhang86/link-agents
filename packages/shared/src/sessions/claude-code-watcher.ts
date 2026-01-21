/**
 * Claude Code Session Watcher
 *
 * Watches for changes in Claude Code session files and emits events.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { SessionChangeEvent } from './claude-code-types.ts';

const getClaudeConfigDir = (): string =>
  process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

export class ClaudeCodeSessionWatcher {
  private watchers: fs.FSWatcher[] = [];
  private callbacks = new Set<(event: SessionChangeEvent) => void>();
  private historyPath: string;
  private projectsDir: string;
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private lastHistorySize = 0;

  constructor() {
    const claudeDir = getClaudeConfigDir();
    this.historyPath = path.join(claudeDir, 'history.jsonl');
    this.projectsDir = path.join(claudeDir, 'projects');
  }

  /**
   * Start watching for changes
   */
  start(): void {
    try {
      // Watch history.jsonl for new sessions
      if (fs.existsSync(this.historyPath)) {
        this.lastHistorySize = fs.statSync(this.historyPath).size;

        const historyWatcher = fs.watch(this.historyPath, (eventType) => {
          if (eventType === 'change') {
            this.onHistoryChange();
          }
        });
        this.watchers.push(historyWatcher);
      }

      // Watch projects directory for transcript changes
      if (fs.existsSync(this.projectsDir)) {
        const projectsWatcher = fs.watch(
          this.projectsDir,
          { recursive: true },
          (eventType, filename) => {
            if (filename && filename.endsWith('.jsonl')) {
              this.onTranscriptChange(filename);
            }
          }
        );
        this.watchers.push(projectsWatcher);
      }
    } catch (error) {
      console.error('Error starting Claude Code session watcher:', error);
    }
  }

  /**
   * Stop watching
   */
  stop(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  /**
   * Register a callback for session changes
   */
  onChange(callback: (event: SessionChangeEvent) => void): void {
    this.callbacks.add(callback);
  }

  /**
   * Unregister a callback
   */
  offChange(callback: (event: SessionChangeEvent) => void): void {
    this.callbacks.delete(callback);
  }

  /**
   * Handle history.jsonl changes
   */
  private async onHistoryChange(): Promise<void> {
    try {
      const currentSize = fs.statSync(this.historyPath).size;

      // Only process if file grew (new entries added)
      if (currentSize > this.lastHistorySize) {
        // Read only the new content
        const fd = fs.openSync(this.historyPath, 'r');
        const buffer = Buffer.alloc(currentSize - this.lastHistorySize);
        fs.readSync(fd, buffer, 0, buffer.length, this.lastHistorySize);
        fs.closeSync(fd);

        const newContent = buffer.toString('utf-8');
        const newLines = newContent.split('\n').filter((line) => line.trim());

        // Parse new entries
        for (const line of newLines) {
          try {
            const entry = JSON.parse(line);
            const sessionId = entry.sessionId;

            if (sessionId) {
              this.emitDebounced(sessionId, 'session-updated');
            }
          } catch (error) {
            console.error('Error parsing history line:', error);
          }
        }

        this.lastHistorySize = currentSize;
      }
    } catch (error) {
      console.error('Error handling history change:', error);
    }
  }

  /**
   * Handle transcript file changes
   */
  private onTranscriptChange(filename: string): void {
    try {
      // Extract session ID from filename
      // Format: {sessionId}.jsonl or subagents/agent-{hash}.jsonl
      const basename = path.basename(filename, '.jsonl');

      // Only process main session transcripts (not agent transcripts)
      if (!basename.startsWith('agent-') && !filename.includes('subagents')) {
        const sessionId = basename;
        this.emitDebounced(sessionId, 'session-updated');
      }
    } catch (error) {
      console.error('Error handling transcript change:', error);
    }
  }

  /**
   * Emit event with debouncing to avoid rapid-fire updates
   */
  private emitDebounced(sessionId: string, type: 'session-created' | 'session-updated'): void {
    // Clear existing timer for this session
    const existingTimer = this.debounceTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer (500ms debounce)
    const timer = setTimeout(() => {
      this.emit({
        type,
        sessionId,
        timestamp: Date.now(),
      });
      this.debounceTimers.delete(sessionId);
    }, 500);

    this.debounceTimers.set(sessionId, timer);
  }

  /**
   * Emit event to all callbacks
   */
  private emit(event: SessionChangeEvent): void {
    for (const callback of this.callbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in session change callback:', error);
      }
    }
  }
}
