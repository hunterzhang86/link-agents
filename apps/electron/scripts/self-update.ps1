param(
  [Parameter(Mandatory = $true)]
  [string]$InstallerPath,
  [Parameter(Mandatory = $false)]
  [string]$AppPath
)

if (-not (Test-Path $InstallerPath)) {
  Write-Error "Installer not found at $InstallerPath"
  exit 1
}

# Give the app a moment to quit before installing.
Start-Sleep -Seconds 2

Write-Host "Running installer..."
Start-Process -FilePath $InstallerPath -ArgumentList "/S" -Wait

if ($AppPath -and (Test-Path $AppPath)) {
  Write-Host "Relaunching app..."
  Start-Process -FilePath $AppPath | Out-Null
}
