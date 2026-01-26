/**
 * SkillMenu - Shared menu content for skill actions
 *
 * Used by:
 * - SkillsListPanel (dropdown via "..." button, context menu via right-click)
 * - SkillInfoPage (title dropdown menu)
 *
 * Uses MenuComponents context to render with either DropdownMenu or ContextMenu
 * primitives, allowing the same component to work in both scenarios.
 *
 * Provides consistent skill actions:
 * - Open in New Window
 * - Show in Finder
 * - Delete
 */

import * as React from 'react'
import {
  Trash2,
  FolderOpen,
  AppWindow,
  Download,
  Edit,
} from 'lucide-react'
import { useMenuComponents } from '@/components/ui/menu-context'

export interface SkillMenuProps {
  /** Skill slug */
  skillSlug: string
  /** Skill name for display */
  skillName: string
  /** Whether skill has an update available */
  hasUpdate?: boolean
  /** Callbacks */
  onEdit?: () => void
  onOpenInNewWindow: () => void
  onShowInFinder: () => void
  onUpdate?: () => void
  onDelete: () => void
}

/**
 * SkillMenu - Renders the menu items for skill actions
 * This is the content only, not wrapped in a DropdownMenu or ContextMenu
 */
export function SkillMenu({
  skillSlug,
  skillName,
  hasUpdate,
  onEdit,
  onOpenInNewWindow,
  onShowInFinder,
  onUpdate,
  onDelete,
}: SkillMenuProps) {
  // Get menu components from context (works with both DropdownMenu and ContextMenu)
  const { MenuItem, Separator } = useMenuComponents()

  return (
    <>
      {/* Edit Skill - only show if onEdit is provided */}
      {onEdit && (
        <>
          <MenuItem onClick={onEdit}>
            <Edit className="h-3.5 w-3.5" />
            <span className="flex-1">Edit Skill</span>
          </MenuItem>
          <Separator />
        </>
      )}

      {/* Open in New Window */}
      <MenuItem onClick={onOpenInNewWindow}>
        <AppWindow className="h-3.5 w-3.5" />
        <span className="flex-1">Open in New Window</span>
      </MenuItem>

      {/* Show in Finder */}
      <MenuItem onClick={onShowInFinder}>
        <FolderOpen className="h-3.5 w-3.5" />
        <span className="flex-1">Show in Finder</span>
      </MenuItem>

      {/* Update (only show if update available) */}
      {hasUpdate && onUpdate && (
        <>
          <Separator />
          <MenuItem onClick={onUpdate}>
            <Download className="h-3.5 w-3.5" />
            <span className="flex-1">Update Skill</span>
          </MenuItem>
        </>
      )}

      <Separator />

      {/* Delete */}
      <MenuItem onClick={onDelete} variant="destructive">
        <Trash2 className="h-3.5 w-3.5" />
        <span className="flex-1">Delete Skill</span>
      </MenuItem>
    </>
  )
}
