/**
 * SkillImportView
 *
 * Import skills from various sources: files, folders, Git repositories, and URLs.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileUp, FolderUp, GitBranch, Link, Loader2 } from "lucide-react";
import { useState } from "react";

export interface SkillImportViewProps {
  workspaceId?: string;
  workspaceRootPath?: string;
}

export function SkillImportView({
  workspaceId,
  workspaceRootPath,
}: SkillImportViewProps) {
  const [gitUrl, setGitUrl] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileImport = async () => {
    if (!workspaceId) return;

    setImporting("file");
    setError(null);
    setSuccess(null);

    try {
      const result = await window.electronAPI.openFileDialog({
        filters: [
          { name: "Skill Files", extensions: ["md"] },
          { name: "All Files", extensions: ["*"] },
        ],
        properties: ["openFile"],
      });

      if (result.filePaths && result.filePaths[0]) {
        const filePath = result.filePaths[0];
        const ext = filePath.split(".").pop()?.toLowerCase();

        let importResult;
        if (ext === "zip") {
          importResult = await window.electronAPI.importSkillFromZip(
            workspaceId,
            filePath,
          );
        } else {
          importResult = await window.electronAPI.importSkillFromFile(
            workspaceId,
            filePath,
          );
        }

        if (importResult.success) {
          setSuccess(
            `Successfully imported skill: ${importResult.skill?.metadata.name || "Unknown"}`,
          );
        } else {
          setError(importResult.error || "Failed to import skill");
        }
      }
    } catch (err) {
      setError(`Failed to import skill from file: ${err}`);
    } finally {
      setImporting(null);
    }
  };

  const handleFolderImport = async () => {
    if (!workspaceId) return;

    setImporting("folder");
    setError(null);
    setSuccess(null);

    try {
      const result = await window.electronAPI.openFileDialog({
        properties: ["openDirectory"],
      });

      if (result.filePaths && result.filePaths[0]) {
        const importResult = await window.electronAPI.importSkillFromFolder(
          workspaceId,
          result.filePaths[0],
        );

        if (importResult.success) {
          setSuccess(
            `Successfully imported skill: ${importResult.skill?.metadata.name || "Unknown"}`,
          );
        } else {
          setError(importResult.error || "Failed to import skill");
        }
      }
    } catch (err) {
      setError(`Failed to import skill from folder: ${err}`);
    } finally {
      setImporting(null);
    }
  };

  const handleGitImport = async () => {
    if (!workspaceId || !gitUrl.trim()) return;

    setImporting("git");
    setError(null);
    setSuccess(null);

    try {
      const result = await window.electronAPI.importSkillFromGit(
        workspaceId,
        gitUrl.trim(),
      );

      if (result.success) {
        setSuccess(
          `Successfully imported skill: ${result.skill?.metadata.name || "Unknown"}`,
        );
        setGitUrl("");
      } else {
        setError(result.error || "Failed to import skill");
      }
    } catch (err) {
      setError(`Failed to import skill from Git: ${err}`);
    } finally {
      setImporting(null);
    }
  };

  const handleUrlImport = async () => {
    if (!workspaceId || !importUrl.trim()) return;

    setImporting("url");
    setError(null);
    setSuccess(null);

    try {
      const result = await window.electronAPI.importSkillFromUrl(
        workspaceId,
        importUrl.trim(),
      );

      if (result.success) {
        setSuccess(
          `Successfully imported skill: ${result.skill?.metadata.name || "Unknown"}`,
        );
        setImportUrl("");
      } else {
        setError(result.error || "Failed to import skill");
      }
    } catch (err) {
      setError(`Failed to import skill from URL: ${err}`);
    } finally {
      setImporting(null);
    }
  };

  return (
    <ScrollArea className="flex-1">
      <div className="px-2 py-4 space-y-6">
        {/* Success message */}
        {success && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm">
            {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Import from File */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Import from File</Label>
          <p className="text-xs text-muted-foreground">
            Select a SKILL.md file or ZIP archive containing a skill
          </p>
          <Button
            onClick={handleFileImport}
            disabled={importing !== null}
            className="w-full"
            variant="outline"
          >
            {importing === "file" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4 mr-2" />
                Select SKILL.md or ZIP
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* Import from Folder */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Import from Folder</Label>
          <p className="text-xs text-muted-foreground">
            Select a folder containing a SKILL.md file
          </p>
          <Button
            onClick={handleFolderImport}
            disabled={importing !== null}
            className="w-full"
            variant="outline"
          >
            {importing === "folder" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FolderUp className="h-4 w-4 mr-2" />
                Select Folder
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* Import from Git */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Import from Git Repository
          </Label>
          <p className="text-xs text-muted-foreground">
            Clone a skill from a Git repository URL(need repository is the skill
            root directory)
          </p>
          <Input
            placeholder="https://github.com/user/skill.git"
            value={gitUrl}
            onChange={(e) => setGitUrl(e.target.value)}
            disabled={importing !== null}
          />
          <Button
            onClick={handleGitImport}
            disabled={importing !== null || !gitUrl.trim()}
            className="w-full"
            variant="outline"
          >
            {importing === "git" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cloning...
              </>
            ) : (
              <>
                <GitBranch className="h-4 w-4 mr-2" />
                Clone Repository
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* Import from URL */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Import from URL</Label>
          <p className="text-xs text-muted-foreground">
            Download a skill from a direct URL(if skill in remote URL, need URL
            is the skill root directory)
          </p>
          <Input
            placeholder="https://skills.sh/skill-name or direct file URL"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            disabled={importing !== null}
          />
          <Button
            onClick={handleUrlImport}
            disabled={importing !== null || !importUrl.trim()}
            className="w-full"
            variant="outline"
          >
            {importing === "url" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Link className="h-4 w-4 mr-2" />
                Download Skill
              </>
            )}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
