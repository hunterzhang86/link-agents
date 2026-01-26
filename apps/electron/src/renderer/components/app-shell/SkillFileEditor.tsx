/**
 * SkillFileEditor
 *
 * Multi-file editor for Skills with markdown preview and file browser.
 * Layout: Left side = Editor with preview toggle, Right side = File browser
 */

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  Save,
  Trash2,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react'
import { Info_Markdown } from '@/components/info'
import { ShikiCodeEditor } from '@/components/shiki/ShikiCodeEditor'
import type { SkillFile } from '../../../shared/types'

interface SkillFileEditorProps {
  workspaceId: string
  skillSlug: string
  onSave?: () => void
}

interface EditingFile {
  relativePath: string  // e.g., "SKILL.md" or "scripts/setup.sh"
  name: string          // e.g., "SKILL.md" or "setup.sh"
  content: string
  originalContent: string
  modified: boolean
}

export function SkillFileEditor({
  workspaceId,
  skillSlug,
  onSave,
}: SkillFileEditorProps) {
  const [files, setFiles] = useState<SkillFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Current editing file
  const [currentFile, setCurrentFile] = useState<EditingFile | null>(null)
  const [saving, setSaving] = useState(false)

  // File tree state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([]))

  // View mode for markdown files - default to preview for SKILL.md
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview')

  // Load skill files
  useEffect(() => {
    loadFiles({ forceOpenDefault: true })
  }, [workspaceId, skillSlug])

  // Recursively collect all folder paths from file tree
  const collectAllFolderPaths = (fileList: SkillFile[], basePath: string = ''): string[] => {
    const paths: string[] = []

    for (const file of fileList) {
      if (file.type === 'directory') {
        const relativePath = basePath ? `${basePath}/${file.name}` : file.name
        paths.push(relativePath)

        // Recursively collect paths from children
        if (file.children) {
          paths.push(...collectAllFolderPaths(file.children, relativePath))
        }
      }
    }

    return paths
  }

  const loadFiles = async ({ forceOpenDefault = false }: { forceOpenDefault?: boolean } = {}) => {
    setLoading(true)
    setError(null)

    try {
      const skillFiles = await window.electronAPI.getSkillFiles?.(workspaceId, skillSlug)
      if (skillFiles) {
        setFiles(skillFiles)

        // Auto-expand all folders to show complete directory tree
        const allFolderPaths = collectAllFolderPaths(skillFiles)
        setExpandedFolders(new Set(allFolderPaths))

        // Auto-open SKILL.md if it exists and nothing is currently open
        if (forceOpenDefault || !currentFile) {
          await openFile('SKILL.md', 'SKILL.md')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skill files')
    } finally {
      setLoading(false)
    }
  }

  // Build relative path from file tree position
  const buildRelativePath = (basePath: string, fileName: string): string => {
    return basePath ? `${basePath}/${fileName}` : fileName
  }

  // Open file for editing
  const openFile = async (relativePath: string, name: string) => {
    // Check if we have unsaved changes
    if (currentFile?.modified) {
      const confirmed = window.confirm(
        `You have unsaved changes in ${currentFile.name}. Discard changes?`
      )
      if (!confirmed) {
        return
      }
    }

    try {
      // Read file content via IPC
      const result = await window.electronAPI.readSkillFile(workspaceId, skillSlug, relativePath)

      if (!result.success) {
        setError(result.error || 'Failed to read file')
        return
      }

      const content = result.content || ''

      setCurrentFile({
        relativePath,
        name,
        content,
        originalContent: content,
        modified: false,
      })

      // Auto-switch to preview mode for SKILL.md
      if (name === 'SKILL.md' && name.endsWith('.md')) {
        setViewMode('preview')
      }

      setError(null)
    } catch (err) {
      setError(`Failed to open file ${name}: ${err}`)
    }
  }

  // Update file content
  const updateContent = (content: string) => {
    if (!currentFile) return

    setCurrentFile({
      ...currentFile,
      content,
      modified: content !== currentFile.originalContent,
    })
  }

  // Save current file
  const saveFile = async () => {
    if (!currentFile) return

    setSaving(true)
    setError(null)

    try {
      const result = await window.electronAPI.writeSkillFile(
        workspaceId,
        skillSlug,
        currentFile.relativePath,
        currentFile.content
      )

      if (!result.success) {
        setError(result.error || 'Failed to save file')
        return
      }

      // Update state
      setCurrentFile({
        ...currentFile,
        originalContent: currentFile.content,
        modified: false,
      })

      onSave?.()
    } catch (err) {
      setError(`Failed to save ${currentFile.name}: ${err}`)
    } finally {
      setSaving(false)
    }
  }

  // Delete file with confirmation
  const deleteFile = async (relativePath: string, fileName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${fileName}? This action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    try {
      const result = await window.electronAPI.deleteSkillFile(
        workspaceId,
        skillSlug,
        relativePath
      )

      if (result.success) {
        // Reload files
        await loadFiles()

        // Close the file if it's currently open
        if (currentFile?.relativePath === relativePath) {
          setCurrentFile(null)
        }
      } else {
        setError(result.error || 'Failed to delete file')
      }
    } catch (err) {
      setError(`Failed to delete file: ${err}`)
    }
  }

  // Toggle folder expansion
  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  // Render file tree
  const renderFileTree = (fileList: SkillFile[], basePath: string = ''): React.ReactNode => {
    return fileList.map((file) => {
      const relativePath = buildRelativePath(basePath, file.name)
      const isCurrentFile = currentFile?.relativePath === relativePath

      if (file.type === 'directory') {
        const isExpanded = expandedFolders.has(relativePath)

        return (
          <div key={relativePath}>
            <div
              className="flex items-center gap-1 px-2 py-1.5 hover:bg-accent rounded cursor-pointer group"
              onClick={() => toggleFolder(relativePath)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-blue-500 shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-blue-500 shrink-0" />
              )}
              <span className="text-sm truncate">{file.name}</span>
            </div>
            {isExpanded && file.children && (
              <div className="ml-4 border-l border-border/50 pl-2">
                {renderFileTree(file.children, relativePath)}
              </div>
            )}
          </div>
        )
      } else {
        return (
          <div
            key={relativePath}
            className={`flex items-center justify-between gap-1 px-2 py-1.5 hover:bg-accent rounded cursor-pointer group ${
              isCurrentFile ? 'bg-accent' : ''
            }`}
          >
            <div
              className="flex items-center gap-1 flex-1 min-w-0"
              onClick={() => openFile(relativePath, file.name)}
            >
              <div className="w-3.5 shrink-0" /> {/* Spacer for alignment */}
              <File className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className={`text-sm truncate ${isCurrentFile ? 'font-medium' : ''}`}>
                {file.name}
              </span>
              {currentFile?.relativePath === relativePath && currentFile.modified && (
                <span className="text-xs text-muted-foreground">•</span>
              )}
            </div>
            {file.name !== 'SKILL.md' && (
              <button
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteFile(relativePath, file.name)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )
      }
    })
  }

  const isMarkdownFile = currentFile?.name.endsWith('.md')

  // Detect language from file extension
  const getLanguageFromFileName = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    const languageMap: Record<string, string> = {
      'md': 'markdown',
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'json': 'json',
      'py': 'python',
      'sh': 'bash',
      'bash': 'bash',
      'yml': 'yaml',
      'yaml': 'yaml',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'xml': 'xml',
      'xsd': 'xml',
      'xsl': 'xml',
      'xslt': 'xml',
      'svg': 'xml',
      'sql': 'sql',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'rb': 'ruby',
      'php': 'php',
      'swift': 'swift',
      'kt': 'kotlin',
      'r': 'r',
      'dockerfile': 'dockerfile',
      'txt': 'text',
    }
    return languageMap[ext || ''] || 'text'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading files...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full relative overflow-hidden">
      {/* Left: Editor with preview - takes remaining space with minimum width */}
      <div className="flex-1 min-w-0 flex flex-col border-r overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <File className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {currentFile?.name || 'No file selected'}
            </span>
            {currentFile?.modified && (
              <span className="text-xs text-muted-foreground">• Modified</span>
            )}
          </div>
          <Button
            size="sm"
            onClick={saveFile}
            disabled={!currentFile?.modified || saving}
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Editor/Preview */}
        {currentFile ? (
          isMarkdownFile ? (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'edit' | 'preview')} className="flex-1 flex flex-col">
              <TabsList className="mx-3 mt-3 w-fit">
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="flex-1 mt-0">
                <ShikiCodeEditor
                  value={currentFile.content}
                  language={getLanguageFromFileName(currentFile.name)}
                  onChange={updateContent}
                  placeholder="Enter markdown content..."
                  className="h-full border rounded"
                />
              </TabsContent>

              <TabsContent value="preview" className="flex-1 mt-0">
                <ScrollArea className="h-full">
                  <div className="px-1 py-2">
                    <Info_Markdown maxHeight={undefined} className="px-3 pb-2">
                      {currentFile.content || '*No content*'}
                    </Info_Markdown>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex-1">
              <ShikiCodeEditor
                value={currentFile.content}
                language={getLanguageFromFileName(currentFile.name)}
                onChange={updateContent}
                placeholder="File content..."
                className="h-full"
              />
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a file to edit
          </div>
        )}
      </div>

      {/* Right: File browser - responsive width, always visible */}
      <div className="w-1/4 min-w-[200px] max-w-[400px] shrink-0 flex flex-col border-l">
        <div className="px-2 py-2 border-b">
          <h3 className="text-sm font-medium">Files</h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-1 py-1">
            {files.length > 0 ? (
              renderFileTree(files)
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No files found
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
