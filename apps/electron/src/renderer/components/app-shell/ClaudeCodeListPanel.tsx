/**
 * Claude Code List Panel
 *
 * Shows Claude Code sessions in the navigator panel (middle column).
 * Similar to SourcesListPanel and SkillsListPanel.
 */

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Download } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Spinner } from '@craft-agent/ui';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { navigate, routes } from '@/lib/navigate';

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

interface ClaudeCodeListPanelProps {
  workspaceRootPath: string;
  onSessionClick: (sessionId: string) => void;
  selectedSessionId: string | null;
}

export function ClaudeCodeListPanel({
  workspaceRootPath,
  onSessionClick,
  selectedSessionId,
}: ClaudeCodeListPanelProps) {
  const [sessions, setSessions] = useState<ClaudeCodeSessionMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      const loaded = await window.electronAPI.getClaudeCodeSessions();
      setSessions(loaded);
    } catch (error) {
      console.error('Error loading Claude Code sessions:', error);
      toast.error('Failed to load Claude Code sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleImport = async (sessionId: string) => {
    setImporting(sessionId);
    try {
      const result = await window.electronAPI.importClaudeCodeSession(
        sessionId,
        workspaceRootPath
      );
      toast.success('Session imported');
      // Navigate to imported session in All Chats
      navigate(routes.view.allChats(result.sessionId));
    } catch (error) {
      console.error('Error importing session:', error);
      toast.error('Import failed');
    } finally {
      setImporting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ExternalLink className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">
          No Claude Code sessions found
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Start a session with Happy or Claude Code
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              'group p-3 rounded-lg border cursor-pointer',
              'hover:bg-accent/50 transition-colors',
              selectedSessionId === session.sessionId && 'bg-accent'
            )}
            onClick={() => onSessionClick(session.sessionId)}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate mb-1">
                  {session.preview || 'Untitled Session'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {session.messageCount} messages • {formatDistanceToNow(new Date(session.lastUsedAt), { addSuffix: true })}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleImport(session.sessionId);
                }}
                disabled={importing === session.sessionId}
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
            <div className="text-xs text-muted-foreground truncate">
              {session.project}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
