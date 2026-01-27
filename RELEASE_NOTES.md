# Release Notes

## Version [Latest] - 2026-01-26

### 🎉 Major Updates

#### Brand Migration: Craft Agents → Link Agents
- Complete rebranding from Craft Agents to Link Agents across the entire codebase
- Updated all branding assets, logos, and icons
- New `LinkAgentsLogo` and `LinkAgentsSymbol` components
- Updated configuration paths to use `~/.link-agents/` directory structure
- All documentation and references updated to reflect the new brand

#### 🚀 Skills System - Complete Implementation
A comprehensive skills management system has been added, enabling users to extend Claude's capabilities with specialized instructions.

**New Features:**
- **Skills Catalog View**: Browse and discover skills from the marketplace
- **Skills Import**: Import skills from multiple sources:
  - GitHub repositories (git)
  - Skills.sh marketplace (skillssh)
  - Local files and folders
  - ZIP archives
- **Skills Editor**: Built-in editor for creating and editing skills with:
  - Syntax highlighting
  - Live preview
  - Validation
- **Skills Management**: 
  - View installed skills
  - Check for updates
  - Track skill sources and versions
  - Detect user modifications
- **Skills Marketplace Panel**: Browse and install skills from the community
- **Skills Menu**: Quick access to skills functionality

**Skills Format:**
- Uses the same SKILL.md format as Claude Code SDK for full compatibility
- Supports YAML frontmatter with metadata (name, description, globs, alwaysAllow)
- Workspace-scoped skills with fallback to SDK skills
- Icon support (emoji or URL-based icons)

**Skills Storage:**
- Skills stored per-workspace at `~/.link-agents/workspaces/{id}/skills/{slug}/`
- Automatic icon downloading and caching
- Source tracking for update management

### 🔧 Improvements

#### Installation & Build Scripts
- Enhanced installation scripts with improved error handling
- Updated build scripts for macOS, Linux, and Windows
- Improved GitHub API integration for versioning and checksum verification
- Better error messages and user feedback during installation

#### Configuration & Storage
- Updated configuration paths to new `~/.link-agents/` structure
- Improved config watcher for better file system monitoring
- Enhanced storage utilities for skills and workspace data
- Better handling of configuration migrations

#### UI/UX Enhancements
- Updated Skill Info Page with new skills management features
- Enhanced App Settings Page with skills-related options
- Improved Preferences Page layout
- Better integration of skills into the main application flow

#### Code Quality
- Refactored agent implementation from `craft-agent.ts` to `link-agent.ts`
- Updated mode manager for better permission handling
- Enhanced session-scoped tools integration
- Improved branding utilities and configuration

### 📦 Package Updates
- Updated dependencies across all packages
- Improved TypeScript configurations
- Enhanced build configurations for Electron app

### 🐛 Bug Fixes
- Fixed configuration path issues
- Improved error handling in various components
- Better compatibility with latest project architecture

### 📝 Documentation
- Updated README with new installation instructions
- Enhanced documentation for skills system
- Updated contributing guidelines
- Revised security and trademark information

### 🔄 Migration Notes

**For Existing Users:**
- Configuration directory has changed from `~/.link-agents/` to `~/.link-agents/`
- You may need to migrate your existing configuration
- Skills from previous versions will need to be re-imported if using the new skills system

**Breaking Changes:**
- Configuration paths updated - manual migration may be required
- Some internal APIs have changed to support the new branding

### 📊 Statistics
- **172 files changed**
- **4,791 insertions**
- **1,088 deletions**
- **Major new components**: 6 new skill-related UI components
- **New packages/modules**: Skills catalog, import, storage, and updates modules

---

## Previous Releases

### Version [Previous] - GitHub API Enhancements
- Enhanced GitHub API request handling in installation script
- Improved versioning and checksum verification

### Version [Previous] - Claude Code Session Management
- Added Claude Code session management features
- Enhanced UI integration for session handling

---

*For detailed changelog, see [git log](https://github.com/hunterzhang86/link-agents/commits/main)*
