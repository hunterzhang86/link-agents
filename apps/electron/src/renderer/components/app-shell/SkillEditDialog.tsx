/**
 * SkillEditDialog
 *
 * Dialog for editing skill files with multi-file support.
 */

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { LoadedSkill } from '../../../shared/types'
import { SkillFileEditor } from './SkillFileEditor'

interface SkillEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill: LoadedSkill
  workspaceId: string
  onSuccess: () => void
}

export function SkillEditDialog({
  open,
  onOpenChange,
  skill,
  workspaceId,
  onSuccess,
}: SkillEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            Edit Skill: {skill.metadata.name}
            {skill.source?.modified && (
              <Badge variant="secondary" className="text-xs">
                Modified
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Edit skill files. The file tree shows all files in the skill directory.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <SkillFileEditor
            workspaceId={workspaceId}
            skillSlug={skill.slug}
            onSave={() => {
              onSuccess()
            }}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
