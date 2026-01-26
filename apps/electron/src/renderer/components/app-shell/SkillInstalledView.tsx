/**
 * SkillInstalledView
 *
 * Displays installed skills with update indicators and management actions.
 * Reuses the SkillItem component from SkillsListPanel with enhanced functionality.
 */

import * as React from 'react'
import { useState, useEffect } from 'react'
import { MoreHorizontal, Download } from 'lucide-react'
import { SkillAvatar } from '@/components/ui/skill-avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  StyledDropdownMenuContent,
} from '@/components/ui/styled-dropdown'
import {
  ContextMenu,
  ContextMenuTrigger,
  StyledContextMenuContent,
} from '@/components/ui/styled-context-menu'
import { DropdownMenuProvider, ContextMenuProvider } from '@/components/ui/menu-context'
import { SkillMenu } from './SkillMenu'
import { EditPopover, getEditConfig } from '@/components/ui/EditPopover'
import { navigate, routes } from '@/lib/navigate'
import { cn } from '@/lib/utils'
import type { LoadedSkill } from '../../../shared/types'

export interface SkillInstalledViewProps {
  skills: LoadedSkill[]
  onDeleteSkill: (skillSlug: string) => void
  onSkillClick: (skill: LoadedSkill) => void
  selectedSkillSlug?: string | null
  workspaceId?: string
  workspaceRootPath?: string
}

export function SkillInstalledView({
  skills,
  onDeleteSkill,
  onSkillClick,
  selectedSkillSlug,
  workspaceId,
  workspaceRootPath,
}: SkillInstalledViewProps) {
  const [updates, setUpdates] = useState<Record<string, boolean>>({})
  const [checkingUpdates, setCheckingUpdates] = useState(false)

  // Check for updates on mount
  useEffect(() => {
    if (!workspaceId) return

    setCheckingUpdates(true)
    window.electronAPI
      .checkSkillUpdates(workspaceId)
      .then((result) => {
        if (result.success) {
          const updateMap: Record<string, boolean> = {}
          result.updates.forEach((u: { slug: string; hasUpdate: boolean }) => {
            updateMap[u.slug] = u.hasUpdate
          })
          setUpdates(updateMap)
        }
      })
      .catch((error) => {
        console.error('Failed to check skill updates:', error)
      })
      .finally(() => {
        setCheckingUpdates(false)
      })
  }, [workspaceId])

  const handleUpdate = async (skillSlug: string) => {
    if (!workspaceId) return

    // Find the skill to check if it's modified
    const skill = skills.find((s) => s.slug === skillSlug)
    if (skill?.source?.modified) {
      // Show confirmation dialog for modified skills
      const confirmed = window.confirm(
        'This skill has been modified. Updating will discard your changes. Do you want to continue?'
      )
      if (!confirmed) {
        return
      }
    }

    try {
      const result = await window.electronAPI.updateSkill(workspaceId, skillSlug)
      if (result.success) {
        // Refresh updates after successful update
        const updateResult = await window.electronAPI.checkSkillUpdates(workspaceId)
        if (updateResult.success) {
          const updateMap: Record<string, boolean> = {}
          updateResult.updates.forEach((u: { slug: string; hasUpdate: boolean }) => {
            updateMap[u.slug] = u.hasUpdate
          })
          setUpdates(updateMap)
        }
      }
    } catch (error) {
      console.error('Failed to update skill:', error)
    }
  }

  return (
    <ScrollArea className="flex-1">
      <div className="pb-2">
        {skills.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No skills configured.</p>
            {workspaceRootPath && (
              <EditPopover
                trigger={
                  <button className="mt-2 text-sm text-foreground hover:underline">
                    Add your first skill
                  </button>
                }
                {...getEditConfig('add-skill', workspaceRootPath)}
              />
            )}
          </div>
        ) : (
          <div className="pt-2">
            {skills.map((skill, index) => (
              <SkillItem
                key={skill.slug}
                skill={skill}
                isSelected={selectedSkillSlug === skill.slug}
                isFirst={index === 0}
                workspaceId={workspaceId}
                hasUpdate={updates[skill.slug]}
                onClick={() => onSkillClick(skill)}
                onDelete={() => onDeleteSkill(skill.slug)}
                onUpdate={() => handleUpdate(skill.slug)}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

interface SkillItemProps {
  skill: LoadedSkill
  isSelected: boolean
  isFirst: boolean
  workspaceId?: string
  hasUpdate?: boolean
  onClick: () => void
  onDelete: () => void
  onUpdate: () => void
}

function SkillItem({
  skill,
  isSelected,
  isFirst,
  workspaceId,
  hasUpdate,
  onClick,
  onDelete,
  onUpdate,
}: SkillItemProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [contextMenuOpen, setContextMenuOpen] = useState(false)

  const handleEdit = () => {
    // Navigate to the skill info page where user can click "Edit Files"
    navigate(routes.view.skills(skill.slug))
  }

  return (
    <div className="skill-item" data-selected={isSelected || undefined}>
      {/* Separator - only show if not first */}
      {!isFirst && (
        <div className="skill-separator pl-12 pr-4">
          <Separator />
        </div>
      )}
      {/* Wrapper for button + dropdown + context menu, group for hover state */}
      <ContextMenu modal={true} onOpenChange={setContextMenuOpen}>
        <ContextMenuTrigger asChild>
          <div className="skill-content relative group select-none pl-2 mr-2">
            {/* Skill Avatar - positioned absolutely */}
            <div className="absolute left-[18px] top-3.5 z-10 flex items-center justify-center">
              <SkillAvatar skill={skill} size="sm" workspaceId={workspaceId} />
            </div>
            {/* Main content button */}
            <button
              className={cn(
                'flex w-full items-start gap-2 pl-2 pr-4 py-3 text-left text-sm transition-all outline-none rounded-[8px]',
                isSelected
                  ? 'bg-foreground/5 hover:bg-foreground/7'
                  : 'hover:bg-foreground/2'
              )}
              onClick={onClick}
            >
              {/* Spacer for avatar */}
              <div className="w-5 h-5 shrink-0" />
              {/* Content column */}
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                {/* Title - skill name */}
                <div className="flex items-start gap-2 w-full pr-6 min-w-0">
                  <div className="font-medium font-sans line-clamp-2 min-w-0 -mb-[2px] flex items-center gap-2">
                    {skill.metadata.name}
                    {hasUpdate && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        Update
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Subtitle - description */}
                <div className="flex items-center gap-1.5 text-xs text-foreground/70 w-full -mb-[2px] pr-6 min-w-0">
                  <span className="truncate">{skill.metadata.description}</span>
                </div>
              </div>
            </button>
            {/* Action buttons - visible on hover or when menu is open */}
            <div
              className={cn(
                'absolute right-2 top-2 transition-opacity z-10',
                menuOpen || contextMenuOpen
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100'
              )}
            >
              {/* More menu */}
              <div className="flex items-center rounded-[8px] overflow-hidden border border-transparent hover:border-border/50">
                <DropdownMenu modal={true} onOpenChange={setMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <div className="p-1.5 hover:bg-foreground/10 data-[state=open]:bg-foreground/10 cursor-pointer">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </DropdownMenuTrigger>
                  <StyledDropdownMenuContent align="end">
                    <DropdownMenuProvider>
                      <SkillMenu
                        skillSlug={skill.slug}
                        skillName={skill.metadata.name}
                        hasUpdate={hasUpdate}
                        onEdit={handleEdit}
                        onOpenInNewWindow={() => {
                          window.electronAPI.openUrl(
                            `craftagents://skills/skill/${skill.slug}?window=focused`
                          )
                        }}
                        onShowInFinder={() => {
                          if (workspaceId) {
                            window.electronAPI.openSkillInFinder(workspaceId, skill.slug)
                          }
                        }}
                        onUpdate={hasUpdate ? onUpdate : undefined}
                        onDelete={onDelete}
                      />
                    </DropdownMenuProvider>
                  </StyledDropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        {/* Context menu - same content as dropdown */}
        <StyledContextMenuContent>
          <ContextMenuProvider>
            <SkillMenu
              skillSlug={skill.slug}
              skillName={skill.metadata.name}
              hasUpdate={hasUpdate}
              onEdit={handleEdit}
              onOpenInNewWindow={() => {
                window.electronAPI.openUrl(
                  `craftagents://skills/skill/${skill.slug}?window=focused`
                )
              }}
              onShowInFinder={() => {
                if (workspaceId) {
                  window.electronAPI.openSkillInFinder(workspaceId, skill.slug)
                }
              }}
              onUpdate={hasUpdate ? onUpdate : undefined}
              onDelete={onDelete}
            />
          </ContextMenuProvider>
        </StyledContextMenuContent>
      </ContextMenu>
    </div>
  )
}
