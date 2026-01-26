/**
 * Claude Code Session Writer
 *
 * Exports Link Agents sessions back to Claude Code format.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';
import type {
  ClaudeCodeTranscriptLine,
  ClaudeCodeHistoryEntry,
  ClaudeCodeContentBlock,
} from './claude-code-types.ts';
import type { StoredSession } from './types.ts';
import type { StoredMessage } from '@link-agents/core/types';
import { expandPath } from '../utils/paths.ts';

const getClaudeConfigDir = (): string =>
  process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

export class ClaudeCodeWriter {
  private historyPath: string;
  private projectsDir: string;

  constructor() {
    const claudeDir = getClaudeConfigDir();
    this.historyPath = path.join(claudeDir, 'history.jsonl');
    this.projectsDir = path.join(claudeDir, 'projects');
  }

  /**
   * Export a Link Agents session to Claude Code format
   */
  async exportSession(
    session: StoredSession,
    projectName?: string
  ): Promise<{ claudeSessionId: string; projectPath: string; claudeProjectDir: string }> {
    // 1. Determine session ID (reuse sdkSessionId if available)
    const claudeSessionId = session.sdkSessionId || randomUUID();

    // 2. Determine project name from working directory (prefer user-set workingDirectory)
    const workDir = this.resolveWorkDir(session);
    const project = projectName || this.extractProjectName(workDir);
    const gitBranch = await this.detectGitBranch(workDir);
    const existingTranscriptPath = await this.findTranscriptFile(claudeSessionId);
    const customTitle = this.normalizeCustomTitle(session.name);

    if (existingTranscriptPath) {
      const existingEntries = await this.readTranscriptEntries(existingTranscriptPath);
      const existingUuids = this.collectExistingUuids(existingEntries);
      const lastMessageUuid = this.getLastMessageUuid(existingEntries);
      const lastCustomTitle = this.getLastCustomTitle(existingEntries);
      const newLines = this.buildTranscriptLines({
        session,
        sessionId: claudeSessionId,
        workDir,
        gitBranch,
        existingUuids,
        includeSnapshot: false,
        parentUuid: lastMessageUuid,
      });

      const metadataLines: Record<string, unknown>[] = [];
      if (customTitle && customTitle !== lastCustomTitle) {
        metadataLines.push(this.buildCustomTitleLine(claudeSessionId, customTitle));
      }

      if (newLines.length > 0 || metadataLines.length > 0) {
        await this.appendTranscriptLines(existingTranscriptPath, [...newLines, ...metadataLines]);
        existingEntries.push(...newLines, ...metadataLines);
      }

      const transcriptLines = this.getMessageLines(existingEntries);
      const projectDir = path.dirname(existingTranscriptPath);
      const projectPath = this.extractProjectPath(existingEntries) || workDir;

      await this.updateSessionsIndex(
        projectDir,
        claudeSessionId,
        existingTranscriptPath,
        projectPath,
        session,
        transcriptLines,
        customTitle
      );

      return { claudeSessionId, projectPath, claudeProjectDir: projectDir };
    }

    // 3. Convert messages to transcript format
    const transcriptLines = this.buildTranscriptLines({
      session,
      sessionId: claudeSessionId,
      workDir,
      gitBranch,
      includeSnapshot: true,
    });

    const transcriptMetadataLines: Record<string, unknown>[] = [];
    if (customTitle) {
      transcriptMetadataLines.push(this.buildCustomTitleLine(claudeSessionId, customTitle));
    }

    // 4. Write transcript file
    const projectDir = path.join(this.projectsDir, project);
    await fs.promises.mkdir(projectDir, { recursive: true });

    const transcriptPath = path.join(projectDir, `${claudeSessionId}.jsonl`);
    const transcriptContent = [...transcriptLines, ...transcriptMetadataLines]
      .map((line) => JSON.stringify(line))
      .join('\n');
    await fs.promises.writeFile(transcriptPath, transcriptContent + '\n', 'utf-8');

    // 5. Update history.jsonl (use workDir as project, not the projects subdirectory)
    await this.updateHistory(
      claudeSessionId,
      workDir,
      session.name || 'Exported Session'
    );

    // 6. Update sessions-index.json
    await this.updateSessionsIndex(
      projectDir,
      claudeSessionId,
      transcriptPath,
      workDir,
      session,
      transcriptLines,
      customTitle
    );

    return { claudeSessionId, projectPath: workDir, claudeProjectDir: projectDir };
  }

  /**
   * Convert Craft message to Claude Code transcript line
   */
  private convertMessage(
    message: StoredMessage,
    sessionId: string,
    cwd: string,
    parentUuid: string | null
  ): ClaudeCodeTranscriptLine {
    // Parse content for thinking blocks
    const content: ClaudeCodeContentBlock[] = [];
    const thinkingRegex = /\[Thinking: (.*?)\]/gs;
    let lastIndex = 0;
    let match;

    while ((match = thinkingRegex.exec(message.content)) !== null) {
      // Add text before thinking block
      if (match.index > lastIndex) {
        const text = message.content.slice(lastIndex, match.index).trim();
        if (text) {
          content.push({ type: 'text', text });
        }
      }
      // Add thinking block
      content.push({ type: 'thinking', text: match[1] });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < message.content.length) {
      const text = message.content.slice(lastIndex).trim();
      if (text) {
        content.push({ type: 'text', text });
      }
    }

    // If no thinking blocks found, just use plain text
    if (content.length === 0) {
      content.push({ type: 'text', text: message.content });
    }

    const line: ClaudeCodeTranscriptLine = {
      type: message.type,
      message: {
        role: message.type,
        content,
      },
      uuid: message.id,
      timestamp: message.timestamp
        ? new Date(message.timestamp).toISOString()
        : new Date().toISOString(),
      sessionId,
      cwd,
      parentUuid,
      isSidechain: false,
      userType: 'external',
    };

    if (message.type === 'assistant') {
      line.message = {
        ...line.message,
        id: message.id,
        type: 'message',
      };
    }

    return line;
  }

  /**
   * Update history.jsonl with new session entry
   */
  private async updateHistory(
    sessionId: string,
    workingDirectory: string,
    preview: string
  ): Promise<void> {
    const entry: ClaudeCodeHistoryEntry = {
      display: preview,
      pastedContents: {},
      timestamp: Date.now(),
      project: workingDirectory,
      sessionId,
    };

    // Ensure history file exists
    try {
      await fs.promises.access(this.historyPath);
    } catch {
      // Create empty history file if it doesn't exist
      await fs.promises.mkdir(path.dirname(this.historyPath), { recursive: true });
      await fs.promises.writeFile(this.historyPath, '', 'utf-8');
    }

    // Append to history.jsonl
    await fs.promises.appendFile(
      this.historyPath,
      JSON.stringify(entry) + '\n',
      'utf-8'
    );
  }

  /**
   * Update sessions-index.json with new session entry
   */
  private async updateSessionsIndex(
    projectDir: string,
    sessionId: string,
    transcriptPath: string,
    projectPath: string,
    session: StoredSession,
    transcriptLines: ClaudeCodeTranscriptLine[],
    customTitle?: string
  ): Promise<void> {
    const indexPath = path.join(projectDir, 'sessions-index.json');

    // Read existing index or create new one
    let index: { version: number; entries: any[] } = { version: 1, entries: [] };
    try {
      const content = await fs.promises.readFile(indexPath, 'utf-8');
      index = JSON.parse(content);
    } catch {
      // Index doesn't exist yet, use default
    }

    // Get file stats for mtime
    const stats = await fs.promises.stat(transcriptPath);

    // Find first user message for firstPrompt
    const firstUserMessage = transcriptLines.find(line => line.type === 'user');
    const firstPrompt = firstUserMessage
      ? (Array.isArray(firstUserMessage.message.content)
          ? firstUserMessage.message.content
              .filter(block => block.type === 'text' && 'text' in block)
              .map(block => 'text' in block ? block.text : '')
              .join('')
          : typeof firstUserMessage.message.content === 'string'
              ? firstUserMessage.message.content
              : '')
      : '';

    const messageLines = this.getMessageLines(transcriptLines);
    const createdAt = messageLines[0]?.timestamp
      ?? new Date(session.createdAt).toISOString();
    const modifiedAt = messageLines[messageLines.length - 1]?.timestamp
      ?? new Date(session.lastUsedAt).toISOString();
    const messageCount = this.countTranscriptMessages(transcriptLines);
    const gitBranch = messageLines[messageLines.length - 1]?.gitBranch;

    // Create index entry
    const entry = {
      sessionId,
      fullPath: transcriptPath,
      fileMtime: stats.mtimeMs,
      firstPrompt,
      ...(customTitle ? { customTitle } : {}),
      messageCount,
      created: createdAt,
      modified: modifiedAt,
      ...(gitBranch ? { gitBranch } : {}),
      projectPath,
      isSidechain: false,
    };

    // Remove existing entry if present (for updates)
    index.entries = index.entries.filter(e => e.sessionId !== sessionId);

    // Add new entry
    index.entries.push(entry);

    // Sort by modified time (newest first)
    index.entries.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    // Write index
    await fs.promises.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * Extract project name from working directory path
   * Converts path to Claude Code format: /Users/foo/bar -> -Users-foo-bar
   */
  private extractProjectName(workingDirectory?: string): string {
    if (!workingDirectory) {
      return 'craft-agents';
    }
    // Match Claude Code slug format (same as J5A in CLI)
    return workingDirectory.replace(/[^a-zA-Z0-9]/g, '-');
  }

  private resolveWorkDir(session: StoredSession): string {
    const raw = session.workingDirectory || session.sdkCwd || process.cwd();
    const expanded = expandPath(raw);
    try {
      return fs.realpathSync(expanded);
    } catch {
      return expanded;
    }
  }

  private async findTranscriptFile(sessionId: string): Promise<string | null> {
    try {
      if (!fs.existsSync(this.projectsDir)) {
        return null;
      }

      const projectDirs = await fs.promises.readdir(this.projectsDir);
      for (const projectDir of projectDirs) {
        const projectPath = path.join(this.projectsDir, projectDir);
        const stat = await fs.promises.stat(projectPath);
        if (!stat.isDirectory()) {
          continue;
        }

        const transcriptPath = path.join(projectPath, `${sessionId}.jsonl`);
        if (fs.existsSync(transcriptPath)) {
          return transcriptPath;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private async readTranscriptEntries(transcriptPath: string): Promise<any[]> {
    try {
      const content = await fs.promises.readFile(transcriptPath, 'utf-8');
      const entries: any[] = [];
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          entries.push(JSON.parse(trimmed));
        } catch {
          // Skip malformed lines to avoid blocking sync.
        }
      }
      return entries;
    } catch {
      return [];
    }
  }

  private collectExistingUuids(entries: any[]): Set<string> {
    const uuids = new Set<string>();
    for (const entry of entries) {
      if (entry && typeof entry.uuid === 'string') {
        uuids.add(entry.uuid);
      }
    }
    return uuids;
  }

  private async appendTranscriptLines(
    transcriptPath: string,
    lines: Array<Record<string, unknown>>
  ): Promise<void> {
    if (lines.length === 0) {
      return;
    }
    const payload = lines.map((line) => JSON.stringify(line)).join('\n') + '\n';
    await fs.promises.appendFile(transcriptPath, payload, 'utf-8');
  }

  private buildTranscriptLines(options: {
    session: StoredSession;
    sessionId: string;
    workDir: string;
    gitBranch?: string;
    existingUuids?: Set<string>;
    includeSnapshot: boolean;
    parentUuid?: string | null;
  }): ClaudeCodeTranscriptLine[] {
    const {
      session,
      sessionId,
      workDir,
      gitBranch,
      existingUuids,
      includeSnapshot,
      parentUuid: startingParentUuid,
    } = options;

    const transcriptLines: ClaudeCodeTranscriptLine[] = [];
    let parentUuid: string | null = startingParentUuid ?? null;

    if (includeSnapshot) {
      const snapshotUuid = randomUUID();
      transcriptLines.push({
        type: 'file-history-snapshot',
        messageId: snapshotUuid,
        snapshot: {
          messageId: snapshotUuid,
          trackedFileBackups: {},
          timestamp: new Date().toISOString(),
        },
        isSnapshotUpdate: false,
      } as any);
    }

    for (const message of session.messages) {
      if (message.type !== 'user' && message.type !== 'assistant') {
        continue;
      }
      const line = this.convertMessage(
        message,
        sessionId,
        workDir,
        parentUuid
      );
      if (gitBranch) {
        line.gitBranch = gitBranch;
      }

      if (!existingUuids?.has(line.uuid)) {
        transcriptLines.push(line);
      }
      parentUuid = line.uuid;
    }

    return transcriptLines;
  }

  private getLastMessageUuid(entries: any[]): string | null {
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const entry = entries[i];
      if (!entry) continue;
      if (entry.type !== 'user' && entry.type !== 'assistant') continue;
      if (typeof entry.uuid === 'string') {
        return entry.uuid;
      }
    }
    return null;
  }

  private buildCustomTitleLine(sessionId: string, title: string): Record<string, unknown> {
    return {
      type: 'custom-title',
      customTitle: title,
      sessionId,
    };
  }

  private normalizeCustomTitle(name?: string | null): string | undefined {
    const title = name?.trim();
    if (!title) {
      return undefined;
    }
    return title;
  }

  private getLastCustomTitle(entries: any[]): string | undefined {
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const entry = entries[i];
      if (entry && entry.type === 'custom-title' && typeof entry.customTitle === 'string') {
        return entry.customTitle;
      }
    }
    return undefined;
  }

  private extractProjectPath(entries: any[]): string | undefined {
    for (const entry of entries) {
      if (entry && typeof entry.cwd === 'string') {
        return entry.cwd;
      }
    }
    return undefined;
  }

  private async detectGitBranch(projectPath: string): Promise<string | undefined> {
    const gitPath = path.join(projectPath, '.git');
    try {
      const stats = await fs.promises.stat(gitPath);
      let headPath = gitPath;

      if (stats.isFile()) {
        const contents = await fs.promises.readFile(gitPath, 'utf-8');
        const match = contents.match(/gitdir:\s*(.+)/i);
        if (!match?.[1]) {
          return undefined;
        }
        const gitDir = match[1].trim();
        headPath = path.join(path.resolve(projectPath, gitDir), 'HEAD');
      } else {
        headPath = path.join(gitPath, 'HEAD');
      }

      const head = await fs.promises.readFile(headPath, 'utf-8');
      const refMatch = head.match(/^ref:\s*refs\/heads\/(.+)\s*$/);
      if (refMatch?.[1]) {
        return refMatch[1];
      }
      const sha = head.trim();
      return sha || undefined;
    } catch {
      return undefined;
    }
  }

  private getMessageLines(transcriptLines: ClaudeCodeTranscriptLine[]): ClaudeCodeTranscriptLine[] {
    return transcriptLines.filter((line) => line.type === 'user' || line.type === 'assistant');
  }

  private countTranscriptMessages(transcriptLines: ClaudeCodeTranscriptLine[]): number {
    let count = 0;
    for (const line of transcriptLines) {
      if (line.type === 'user') {
        const content = line.message?.content;
        if (typeof content === 'string') {
          if (content.trim()) {
            count++;
          }
        } else if (Array.isArray(content)) {
          if (content.some((block) => block.type === 'text' && 'text' in block && String(block.text).trim())) {
            count++;
          }
        }
      } else if (line.type === 'assistant') {
        const content = line.message?.content;
        if (Array.isArray(content)) {
          if (content.some((block) => block.type === 'text' && 'text' in block && String(block.text).trim())) {
            count++;
          }
        }
      }
    }
    return count;
  }
}
