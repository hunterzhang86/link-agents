# Craft Agent Windows Installer
# Usage: irm https://agents.craft.do/install-app.ps1 | iex

$ErrorActionPreference = "Stop"

$DefaultGitHubRepo = if ($env:CRAFT_DEFAULT_GITHUB_REPO) { $env:CRAFT_DEFAULT_GITHUB_REPO } else { "hunterzhang86/link-agents" }
$GitHubRepo = $env:CRAFT_GITHUB_REPO
$GitHubApiBase = if ($env:CRAFT_GITHUB_API_BASE) { $env:CRAFT_GITHUB_API_BASE } else { "https://api.github.com" }
$ReleaseTagOverride = $env:CRAFT_RELEASE_TAG
$RequireChecksum = $env:CRAFT_REQUIRE_CHECKSUM -eq "true"
$DOWNLOAD_DIR = "$env:TEMP\craft-agent-install"
$APP_NAME = "Craft Agent"

# Colors for output
function Write-Info { Write-Host "> $args" -ForegroundColor Blue }
function Write-Success { Write-Host "> $args" -ForegroundColor Green }
function Write-Warn { Write-Host "! $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "x $args" -ForegroundColor Red; exit 1 }

# Check for Windows
if ($env:OS -ne "Windows_NT") {
    Write-Err "This installer is for Windows only."
}

# Try to infer repo from git remote when running inside a clone
if (-not $GitHubRepo) {
    $git = Get-Command git -ErrorAction SilentlyContinue
    if ($git) {
        $origin = git config --get remote.origin.url 2>$null
        if ($origin -and $origin -match 'github\.com[:/](.+?/.+?)(\.git)?$') {
            $GitHubRepo = $Matches[1]
        }
    }
}

if (-not $GitHubRepo) {
    $GitHubRepo = $DefaultGitHubRepo
}

# Detect architecture (Windows installer is x64 only)
$arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
if ($arch -ne "x64") {
    Write-Err "Windows installer is x64 only."
}
$platform = "win-$arch"

Write-Host ""
Write-Info "Detected platform: $platform"

# Create download directory
New-Item -ItemType Directory -Force -Path $DOWNLOAD_DIR | Out-Null

# Get GitHub release info
Write-Info "Fetching GitHub release info..."
$headers = @{
    "Accept" = "application/vnd.github+json"
    "User-Agent" = "craft-agents-installer"
}
if ($env:GITHUB_TOKEN) {
    $headers["Authorization"] = "Bearer $env:GITHUB_TOKEN"
}

$releaseUrl = if ($ReleaseTagOverride) {
    "$GitHubApiBase/repos/$GitHubRepo/releases/tags/$ReleaseTagOverride"
} else {
    "$GitHubApiBase/repos/$GitHubRepo/releases/latest"
}

try {
    $release = Invoke-RestMethod -Uri $releaseUrl -Headers $headers -UseBasicParsing
    $tag = $release.tag_name
} catch {
    Write-Err "Failed to fetch GitHub release from $GitHubRepo. Set CRAFT_GITHUB_REPO or GITHUB_TOKEN if needed. $_"
}

if (-not $tag) {
    Write-Err "Failed to get release tag (set GITHUB_TOKEN if rate-limited)."
}

$version = $tag -replace '^v', ''
Write-Info "Latest version: $version (tag: $tag)"

$filename = "Craft-Agents-$version-$platform.exe"
$installerUrl = "https://github.com/$GitHubRepo/releases/download/$tag/$filename"

# Download installer with progress
$installerPath = Join-Path $DOWNLOAD_DIR $filename

# Clean up any partial download from previous attempts
Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue

Write-Info "Downloading $filename..."

try {
    # Use WebRequest for download with progress
    $webRequest = [System.Net.HttpWebRequest]::Create($installerUrl)
    $webRequest.Timeout = 600000  # 10 minutes
    $response = $webRequest.GetResponse()
    $responseStream = $response.GetResponseStream()
    $fileStream = [System.IO.File]::Create($installerPath)

    $buffer = New-Object byte[] 65536
    $totalRead = 0
    $lastPercent = -1

    while (($read = $responseStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
        $fileStream.Write($buffer, 0, $read)
        $totalRead += $read

        $downloadedMB = [math]::Round($totalRead / 1MB, 1)
        Write-Host -NoNewline ("`r  Downloaded $downloadedMB MB")
    }

    $fileStream.Close()
    $responseStream.Close()
    $response.Close()

    Write-Host ""
    Write-Success "Download complete!"
} catch {
    # Clean up partial download on failure
    if ($fileStream) { $fileStream.Close() }
    if ($responseStream) { $responseStream.Close() }
    if ($response) { $response.Close() }
    Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue
    Write-Err "Download failed: $_"
}

# Verify file was downloaded
if (-not (Test-Path $installerPath)) {
    Write-Err "Download failed: file not found"
}

# Verify checksum if available
$checksum = $null
$checksumUrl = "$installerUrl.sha256"
try {
    $checksumText = Invoke-WebRequest -Uri $checksumUrl -Headers $headers -UseBasicParsing -ErrorAction Stop
    if ($checksumText.Content) {
        $checksum = ($checksumText.Content -split '\s+')[0].ToLower()
    }
} catch {
    $checksum = $null
}

if ($checksum) {
    Write-Info "Verifying checksum..."
    $actualHash = (Get-FileHash -Path $installerPath -Algorithm SHA256).Hash.ToLower()
    if ($actualHash -ne $checksum) {
        Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue
        Write-Err "Checksum verification failed`n  Expected: $checksum`n  Actual:   $actualHash"
    }
    Write-Success "Checksum verified!"
} else {
    if ($RequireChecksum) {
        Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue
        Write-Err "Checksum file not found for $filename"
    }
    Write-Warn "Checksum file not found; skipping verification"
}

# Close the app if it's running
$process = Get-Process -Name "Craft Agent" -ErrorAction SilentlyContinue
if ($process) {
    Write-Info "Closing Craft Agent..."
    $process | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Run the installer
Write-Info "Running installer (follow the installer prompts)..."

try {
    $installerProcess = Start-Process -FilePath $installerPath -PassThru
    $spinner = @('|', '/', '-', '\')
    $i = 0

    while (-not $installerProcess.HasExited) {
        Write-Host -NoNewline ("`r  Installing... " + $spinner[$i % 4] + "   ")
        Start-Sleep -Milliseconds 200
        $i++
    }

    Write-Host -NoNewline "`r                      `r"

    if ($installerProcess.ExitCode -ne 0) {
        Write-Err "Installation failed with exit code: $($installerProcess.ExitCode)"
    }
} catch {
    Write-Err "Installation failed: $_"
}

# Clean up installer
Write-Info "Cleaning up..."
Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue

# Add command line shortcut
Write-Info "Adding 'craft-agents' command to PATH..."

$binDir = "$env:LOCALAPPDATA\Craft Agent\bin"
$cmdFile = "$binDir\craft-agents.cmd"
$exePath = "$env:LOCALAPPDATA\Programs\Craft Agent\Craft Agent.exe"

# Create bin directory
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

# Create batch file launcher
$cmdContent = "@echo off`r`nstart `"`" `"$exePath`" %*"
Set-Content -Path $cmdFile -Value $cmdContent -Encoding ASCII

# Add to user PATH if not already there
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$binDir*") {
    $newPath = "$userPath;$binDir"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Success "Added to PATH (restart terminal to use 'craft-agents' command)"
} else {
    Write-Success "Command 'craft-agents' is ready"
}

Write-Host ""
Write-Host "---------------------------------------------------------------------"
Write-Host ""
Write-Success "Installation complete!"
Write-Host ""
Write-Host "  Craft Agent has been installed."
Write-Host ""
Write-Host "  Launch from:"
Write-Host "    - Start Menu or desktop shortcut"
Write-Host "    - Command line: craft-agents (restart terminal first)"
Write-Host ""
