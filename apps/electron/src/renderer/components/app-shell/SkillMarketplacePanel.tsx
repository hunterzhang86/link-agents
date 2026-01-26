/**
 * SkillMarketplacePanel
 *
 * Tabbed panel for managing skills with marketplace, import, and installed views.
 * Replaces the original SkillsListPanel with enhanced functionality.
 */

import * as React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SkillInstalledView } from './SkillInstalledView'
import { SkillCatalogView } from './SkillCatalogView'
import { SkillImportView } from './SkillImportView'
import type { LoadedSkill } from '../../../shared/types'

export interface SkillMarketplacePanelProps {
  skills: LoadedSkill[]
  onDeleteSkill: (skillSlug: string) => void
  onSkillClick: (skill: LoadedSkill) => void
  selectedSkillSlug?: string | null
  workspaceId?: string
  workspaceRootPath?: string
  className?: string
}

export function SkillMarketplacePanel({
  skills,
  onDeleteSkill,
  onSkillClick,
  selectedSkillSlug,
  workspaceId,
  workspaceRootPath,
  className,
}: SkillMarketplacePanelProps) {
  const [activeTab, setActiveTab] = React.useState('installed')

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="w-full grid grid-cols-3 mt-2">
          <TabsTrigger value="installed">Installed</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="flex-1 mt-0">
          <SkillInstalledView
            skills={skills}
            workspaceId={workspaceId}
            workspaceRootPath={workspaceRootPath}
            onSkillClick={onSkillClick}
            onDeleteSkill={onDeleteSkill}
            selectedSkillSlug={selectedSkillSlug}
          />
        </TabsContent>

        <TabsContent value="marketplace" className="flex-1 mt-0">
          <SkillCatalogView workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="import" className="flex-1 mt-0">
          <SkillImportView
            workspaceId={workspaceId}
            workspaceRootPath={workspaceRootPath}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
