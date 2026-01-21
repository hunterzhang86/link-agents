/**
 * Claude Code Session List Component
 *
 * Displays Claude Code sessions with real-time sync from Happy.
 */

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Spinner } from '@craft-agent/ui';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface ClaudeCodeSessionMetadata {
  id: string;
  sessionId: string;
  preview: string;
  project: string;
  messageCount: number;
  lastUsedAt: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
  };
}

interface ClaudeCodeSessionListProps {
  workspaceRootPath: string;
  onImportSession?: (sessionId: string) => void;
}

export function ClaudeCodeSessionList({
  workspaceRootPath,
  onImportSession,
}: ClaudeCodeSessionListProps) {
  const [sessions, setSessions] = useState<ClaudeCodeSessionMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);

  // Load sessions via IPC
  const loadSessions = useCallback(async () => {
    try {
      const loadedSessions = await window.electronAPI.getClaudeCodeSessions();
      setSessions(loadedSessions);
    } catch (error) {
      console.error('Error loading Claude Code sessions:', error);
      toast.error('Failed to load Claude Code sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Import session to Craft Agents via IPC
  const handleImportSession = useCallback(
    async (sessionId: string) => {
      try {
        setImporting(sessionId);

        const result = await window.electronAPI.importClaudeCodeSession(
          sessionId,
          workspaceRootPath
        );

        toast.success('Session imported successfully');

        if (onImportSession && result.sessionId) {
          onImportSession(result.sessionId);
        }
      } catch (error) {
        console.error('Error importing session:', error);
        toast.error('Failed to import session');
      } finally {
        setImporting(null);
      }
    },
    [workspaceRootPath, onImportSession]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <ExternalLink className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Claude Code Sessions</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start a session with Happy on your phone or use Claude Code in the terminal.
        </p>
        <Button variant="outline" size="sm" onClick={loadSessions}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Claude Code Sessions</h2>
          <p className="text-sm text-muted-foreground">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} from Happy & Claude Code
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadSessions}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Session List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                'group relative p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
                'cursor-pointer'
              )}
            >
              {/* Session Info */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate mb-1">
                    {session.preview || 'Untitled Session'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{session.messageCount} messages</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(session.lastUsedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>

                {/* Import Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleImportSession(session.sessionId)}
                  disabled={importing === session.sessionId}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {importing === session.sessionId ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1" />
                      Import
                    </>
                  )}
                </Button>
              </div>

              {/* Project Path */}
              <div className="text-xs text-muted-foreground truncate">
                {session.project}
              </div>

              {/* Token Usage */}
              {session.tokenUsage && (
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>
                    {(session.tokenUsage.inputTokens + session.tokenUsage.outputTokens).toLocaleString()}{' '}
                    tokens
                  </span>
                  {session.tokenUsage.cacheReadTokens > 0 && (
                    <span>
                      {session.tokenUsage.cacheReadTokens.toLocaleString()} cached
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
