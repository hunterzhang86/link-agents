/**
 * SkillCatalogView
 *
 * Browse and install skills from the skills.sh catalog.
 */

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Search, Download, Loader2, RefreshCw, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { SkillCatalogEntry } from '../../../shared/types'

export interface SkillCatalogViewProps {
  workspaceId?: string
}

export function SkillCatalogView({ workspaceId }: SkillCatalogViewProps) {
  const [catalog, setCatalog] = useState<SkillCatalogEntry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [installing, setInstalling] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Marketplace settings
  const [marketplaceUrl, setMarketplaceUrl] = useState('https://github.com/anthropics/skills')
  const [marketplaceCacheTTL, setMarketplaceCacheTTL] = useState('24')
  const [savingSettings, setSavingSettings] = useState(false)

  // Load marketplace settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!window.electronAPI) return
      try {
        const [url, ttl] = await Promise.all([
          window.electronAPI.getMarketplaceUrl(),
          window.electronAPI.getMarketplaceCacheTTL(),
        ])
        setMarketplaceUrl(url)
        setMarketplaceCacheTTL(String(ttl / (1000 * 60 * 60)))
      } catch (err) {
        console.error('Failed to load marketplace settings:', err)
      }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    // Force refresh on first load to get latest from GitHub
    loadCatalog(true)
  }, [])

  const loadCatalog = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const result = await window.electronAPI.getSkillsCatalog(forceRefresh)
      if (result.success) {
        setCatalog(result.catalog.skills)
      } else {
        setError(result.error || 'Failed to load catalog')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadCatalog(true)
  }

  const handleInstall = async (skill: SkillCatalogEntry) => {
    if (!workspaceId) return

    setInstalling(skill.slug)

    try {
      const result = await window.electronAPI.importSkillFromUrl(
        workspaceId,
        skill.downloadUrl
      )

      if (result.success) {
        // Show success feedback (could add toast notification here)
        console.log('Skill installed successfully:', skill.slug)
      } else {
        console.error('Failed to install skill:', result.error)
      }
    } catch (err) {
      console.error('Failed to install skill:', err)
    } finally {
      setInstalling(null)
    }
  }

  const handleSaveSettings = async () => {
    if (!window.electronAPI) return

    setSavingSettings(true)
    try {
      const ttlMs = parseInt(marketplaceCacheTTL, 10) * 1000 * 60 * 60
      await Promise.all([
        window.electronAPI.setMarketplaceUrl(marketplaceUrl.trim() || 'https://github.com/anthropics/skills'),
        window.electronAPI.setMarketplaceCacheTTL(ttlMs),
      ])
      // Refresh catalog after settings change
      await loadCatalog(true)
    } catch (err) {
      console.error('Failed to save marketplace settings:', err)
    } finally {
      setSavingSettings(false)
    }
  }

  const filtered = catalog.filter(
    (skill) =>
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      skill.description.toLowerCase().includes(search.toLowerCase()) ||
      skill.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading catalog...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2 max-w-sm text-center">
          <p className="text-sm text-muted-foreground">Failed to load catalog</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button size="sm" onClick={loadCatalog}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar with settings and refresh buttons */}
      <div className="p-4 pb-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
            title="Marketplace settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh catalog from GitHub"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-3 p-3 rounded-lg border bg-foreground/2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Marketplace Settings</h3>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setShowSettings(false)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="marketplace-url" className="text-xs">
                  Marketplace URL
                </Label>
                <Input
                  id="marketplace-url"
                  type="url"
                  value={marketplaceUrl}
                  onChange={(e) => setMarketplaceUrl(e.target.value)}
                  placeholder="https://github.com/anthropics/skills"
                  className="h-8 text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  GitHub repository URL for skills catalog
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cache-ttl" className="text-xs">
                  Cache Duration (hours)
                </Label>
                <Input
                  id="cache-ttl"
                  type="number"
                  min="1"
                  max="168"
                  value={marketplaceCacheTTL}
                  onChange={(e) => setMarketplaceCacheTTL(e.target.value)}
                  placeholder="24"
                  className="h-8 text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  How long to cache the catalog before refreshing
                </p>
              </div>

              <Button
                size="sm"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save & Refresh'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Catalog list */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {search ? 'No skills found matching your search' : 'No skills available'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((skill, index) => (
                <React.Fragment key={skill.slug}>
                  {index > 0 && <Separator />}
                  <CatalogSkillItem
                    skill={skill}
                    installing={installing === skill.slug}
                    onInstall={() => handleInstall(skill)}
                  />
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

interface CatalogSkillItemProps {
  skill: SkillCatalogEntry
  installing: boolean
  onInstall: () => void
}

function CatalogSkillItem({ skill, installing, onInstall }: CatalogSkillItemProps) {
  return (
    <div className="group p-3 rounded-lg hover:bg-foreground/2 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon placeholder */}
        <div className="w-10 h-10 rounded-md bg-foreground/5 flex items-center justify-center shrink-0">
          <span className="text-lg">{skill.iconUrl ? '🎨' : '📦'}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm line-clamp-1">{skill.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {skill.description}
              </p>
            </div>

            {/* Install button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={onInstall}
              disabled={installing}
              className="shrink-0"
            >
              {installing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {skill.author && (
              <span className="text-xs text-muted-foreground">by {skill.author}</span>
            )}
            {skill.version && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                v{skill.version}
              </Badge>
            )}
            {skill.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {skill.downloads && (
              <span className="text-xs text-muted-foreground">
                {skill.downloads.toLocaleString()} downloads
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
