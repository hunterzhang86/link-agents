#!/bin/bash

set -e

DEFAULT_GITHUB_REPO="${CRAFT_DEFAULT_GITHUB_REPO:-hunterzhang86/link-agents}"
GITHUB_REPO="${CRAFT_GITHUB_REPO:-}"
GITHUB_API_BASE="${CRAFT_GITHUB_API_BASE:-https://api.github.com}"
GITHUB_RELEASE_TAG="${CRAFT_RELEASE_TAG:-}"
REQUIRE_CHECKSUM="${CRAFT_REQUIRE_CHECKSUM:-false}"
DOWNLOAD_DIR="$HOME/.craft-agent/downloads"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info() { printf "%b\n" "${BLUE}>${NC} $1"; }
success() { printf "%b\n" "${GREEN}>${NC} $1"; }
warn() { printf "%b\n" "${YELLOW}!${NC} $1"; }
error() { printf "%b\n" "${RED}x${NC} $1"; exit 1; }

# Detect OS
OS="$(uname -s)"
case "$OS" in
    Darwin) OS_TYPE="darwin" ;;
    Linux)  OS_TYPE="linux" ;;
    *)      error "Unsupported operating system: $OS" ;;
esac

# Check for required dependencies
DOWNLOADER=""
if command -v curl >/dev/null 2>&1; then
    DOWNLOADER="curl"
elif command -v wget >/dev/null 2>&1; then
    DOWNLOADER="wget"
else
    error "Either curl or wget is required but neither is installed"
fi

# Check if jq is available (optional)
HAS_JQ=false
if command -v jq >/dev/null 2>&1; then
    HAS_JQ=true
fi

# Download function that works with both curl and wget
# Usage: download_file <url> [output_file] [show_progress]
download_file() {
    local url="$1"
    local output="$2"
    local show_progress="${3:-false}"

    if [ "$DOWNLOADER" = "curl" ]; then
        if [ -n "$output" ]; then
            if [ "$show_progress" = "true" ]; then
                curl -fL --progress-bar -o "$output" "$url"
            else
                curl -fsSL -o "$output" "$url"
            fi
        else
            curl -fsSL "$url"
        fi
    elif [ "$DOWNLOADER" = "wget" ]; then
        if [ -n "$output" ]; then
            if [ "$show_progress" = "true" ]; then
                wget --show-progress -q -O "$output" "$url"
            else
                wget -q -O "$output" "$url"
            fi
        else
            wget -q -O - "$url"
        fi
    else
        return 1
    fi
}

github_api_request() {
    local url="$1"
    if [ "$DOWNLOADER" = "curl" ]; then
        if [ -n "${GITHUB_TOKEN:-}" ]; then
            curl -fsSL -H "Accept: application/vnd.github+json" -H "User-Agent: craft-agents-installer" -H "Authorization: Bearer $GITHUB_TOKEN" "$url"
        else
            curl -fsSL -H "Accept: application/vnd.github+json" -H "User-Agent: craft-agents-installer" "$url"
        fi
    else
        if [ -n "${GITHUB_TOKEN:-}" ]; then
            wget -q -O - --header="Accept: application/vnd.github+json" --header="User-Agent: craft-agents-installer" --header="Authorization: Bearer $GITHUB_TOKEN" "$url"
        else
            wget -q -O - --header="Accept: application/vnd.github+json" --header="User-Agent: craft-agents-installer" "$url"
        fi
    fi
}

# Try to infer repo from git remote when running inside a clone
if [ -z "$GITHUB_REPO" ] && command -v git >/dev/null 2>&1; then
    origin_url=$(git config --get remote.origin.url 2>/dev/null || true)
    if [[ $origin_url =~ github\.com[:/](.+/.+?)(\.git)?$ ]]; then
        GITHUB_REPO="${BASH_REMATCH[1]}"
    fi
fi

# Try to infer repo from script URL when downloaded via curl/wget
if [ -z "$GITHUB_REPO" ]; then
    # Check if script was downloaded from raw.githubusercontent.com
    # This works when script is piped: curl ... | bash
    # We check the parent process command line
    if [ -n "${SCRIPT_SOURCE_URL:-}" ]; then
        if [[ $SCRIPT_SOURCE_URL =~ raw\.githubusercontent\.com/(.+?)/.+?/scripts/install-app\.sh ]]; then
            GITHUB_REPO="${BASH_REMATCH[1]}"
        fi
    fi
fi

GITHUB_REPO="${GITHUB_REPO:-$DEFAULT_GITHUB_REPO}"

# Simple JSON parser for extracting values when jq is not available
get_json_value() {
    local json="$1"
    local key="$2"

    # Normalize JSON to single line
    json=$(echo "$json" | tr -d '\n\r\t' | sed 's/ \+/ /g')

    # Extract value using bash regex
    if [[ $json =~ \"$key\"[[:space:]]*:[[:space:]]*\"([^\"]+)\" ]]; then
        echo "${BASH_REMATCH[1]}"
        return 0
    fi

    return 1
}

# Detect architecture
case "$(uname -m)" in
    x86_64|amd64) arch="x64" ;;
    arm64|aarch64) arch="arm64" ;;
    *) error "Unsupported architecture: $(uname -m)" ;;
esac

# Set platform-specific variables
if [ "$OS_TYPE" = "darwin" ]; then
    platform="mac-${arch}"
    APP_NAME="Craft Agent.app"
    INSTALL_DIR="/Applications"
    ext="dmg"
else
    # Linux only supports x64 currently
    if [ "$arch" != "x64" ]; then
        error "Linux currently only supports x64 architecture. Your architecture: $arch"
    fi
    platform="linux-${arch}"
    APP_NAME="Craft-Agent-x64.AppImage"
    INSTALL_DIR="$HOME/.local/bin"
    ext="AppImage"
fi

echo ""
info "Detected platform: $platform"

mkdir -p "$DOWNLOAD_DIR"
mkdir -p "$INSTALL_DIR"

# Get latest version
info "Fetching GitHub release info..."
if [ -n "$GITHUB_RELEASE_TAG" ]; then
    release_url="$GITHUB_API_BASE/repos/$GITHUB_REPO/releases/tags/$GITHUB_RELEASE_TAG"
else
    release_url="$GITHUB_API_BASE/repos/$GITHUB_REPO/releases/latest"
fi

if ! release_json=$(github_api_request "$release_url" 2>&1); then
    http_code=""
    if [ "$DOWNLOADER" = "curl" ]; then
        http_code=$(echo "$release_json" | grep -oP 'HTTP/\d\.\d \K\d+' | tail -1 || echo "")
    fi
    if [ "$http_code" = "404" ]; then
        error "No releases found for $GITHUB_REPO.\n  This repository may not have any releases yet.\n  Set CRAFT_GITHUB_REPO to use a different repository, or create a release first."
    else
        error "Failed to fetch release from $GITHUB_REPO.\n  Set CRAFT_GITHUB_REPO or GITHUB_TOKEN if needed.\n  Error: $release_json"
    fi
fi
if [ "$HAS_JQ" = true ]; then
    tag_name=$(echo "$release_json" | jq -r '.tag_name // empty')
    if [ -z "$tag_name" ] || [ "$tag_name" = "null" ]; then
        # Check if it's a 404 error
        message=$(echo "$release_json" | jq -r '.message // empty' 2>/dev/null || echo "")
        if [ "$message" = "Not Found" ]; then
            error "No releases found for $GITHUB_REPO.\n  This repository may not have any releases yet.\n  Set CRAFT_GITHUB_REPO to use a different repository, or create a release first."
        fi
    fi
else
    tag_name=$(get_json_value "$release_json" "tag_name")
    # Check for 404 error message
    if echo "$release_json" | grep -q '"message".*"Not Found"'; then
        error "No releases found for $GITHUB_REPO.\n  This repository may not have any releases yet.\n  Set CRAFT_GITHUB_REPO to use a different repository, or create a release first."
    fi
fi

if [ -z "$tag_name" ]; then
    error "Failed to get release tag from GitHub. Set GITHUB_TOKEN if rate-limited."
fi

version="${tag_name#v}"
info "Latest version: $version (tag: $tag_name)"

filename="Craft-Agents-${version}-${platform}.${ext}"
installer_url="https://github.com/$GITHUB_REPO/releases/download/$tag_name/$filename"
installer_path="$DOWNLOAD_DIR/$filename"

info "Downloading $filename..."
echo ""
if ! download_file "$installer_url" "$installer_path" true; then
    rm -f "$installer_path"
    error "Download failed"
fi
echo ""

# Verify checksum
checksum=""
checksum_url="${installer_url}.sha256"
checksum_path="$DOWNLOAD_DIR/${filename}.sha256"

if download_file "$checksum_url" "$checksum_path"; then
    checksum=$(awk '{print $1}' "$checksum_path" | tr -d '\r\n')
fi

if [ -n "$checksum" ]; then
    info "Verifying checksum..."
    if [ "$OS_TYPE" = "darwin" ]; then
        actual=$(shasum -a 256 "$installer_path" | cut -d' ' -f1)
    else
        actual=$(sha256sum "$installer_path" | cut -d' ' -f1)
    fi

    if [ "$actual" != "$checksum" ]; then
        rm -f "$installer_path"
        error "Checksum verification failed\n  Expected: $checksum\n  Actual:   $actual"
    fi

    success "Checksum verified!"
else
    if [ "$REQUIRE_CHECKSUM" = "true" ]; then
        rm -f "$installer_path"
        error "Checksum file not found for $filename"
    fi
    warn "Checksum file not found; skipping verification"
fi

# Platform-specific installation
if [ "$OS_TYPE" = "darwin" ]; then
    # macOS installation
    dmg_path="$installer_path"

    # Quit the app if it's running (use bundle ID for reliability)
    APP_BUNDLE_ID="com.lukilabs.craft-agent"
    if pgrep -x "Craft Agent" >/dev/null 2>&1; then
        info "Quitting Craft Agent..."
        osascript -e "tell application id \"$APP_BUNDLE_ID\" to quit" 2>/dev/null || true
        # Wait for app to quit (max 5 seconds) - POSIX compatible loop
        i=0
        while [ $i -lt 10 ]; do
            if ! pgrep -x "Craft Agent" >/dev/null 2>&1; then
                break
            fi
            sleep 0.5
            i=$((i + 1))
        done
        # Force kill if still running
        if pgrep -x "Craft Agent" >/dev/null 2>&1; then
            warn "App didn't quit gracefully. Force quitting (unsaved data may be lost)..."
            pkill -9 -x "Craft Agent" 2>/dev/null || true
            # Wait longer for macOS to release file handles
            sleep 3
        fi
    fi

    # Remove existing installation if present
    if [ -d "$INSTALL_DIR/$APP_NAME" ]; then
        info "Removing previous installation..."
        rm -rf "$INSTALL_DIR/$APP_NAME"
    fi

    # Mount DMG
    info "Mounting disk image..."
    mount_point=$(hdiutil attach "$dmg_path" -nobrowse -mountrandom /tmp 2>/dev/null | tail -1 | awk '{print $NF}')

    if [ -z "$mount_point" ] || [ ! -d "$mount_point" ]; then
        rm -f "$dmg_path"
        error "Failed to mount DMG"
    fi

    # Find the .app in the mounted volume
    app_source=$(find "$mount_point" -maxdepth 1 -name "*.app" -type d | head -1)

    if [ -z "$app_source" ]; then
        hdiutil detach "$mount_point" -quiet 2>/dev/null || true
        rm -f "$dmg_path"
        error "No .app found in DMG"
    fi

    # Copy app to /Applications
    info "Installing to $INSTALL_DIR..."
    cp -R "$app_source" "$INSTALL_DIR/$APP_NAME"

    # Unmount DMG
    info "Cleaning up..."
    hdiutil detach "$mount_point" -quiet 2>/dev/null || true
    rm -f "$dmg_path"

    # Remove quarantine attribute if present
    xattr -rd com.apple.quarantine "$INSTALL_DIR/$APP_NAME" 2>/dev/null || true

    echo ""
    echo "─────────────────────────────────────────────────────────────────────────"
    echo ""
    success "Installation complete!"
    echo ""
    printf "%b\n" "  Craft Agent has been installed to ${BOLD}$INSTALL_DIR/$APP_NAME${NC}"
    echo ""
    printf "%b\n" "  You can launch it from ${BOLD}Applications${NC} or by running:"
    printf "%b\n" "    ${BOLD}open -a 'Craft Agent'${NC}"
    echo ""

else
    # Linux installation
    appimage_path="$installer_path"

    # New paths
    APP_DIR="$HOME/.craft-agent/app"
    WRAPPER_PATH="$INSTALL_DIR/craft-agents"
    APPIMAGE_INSTALL_PATH="$APP_DIR/Craft-Agent-x64.AppImage"

    # Kill the app if it's running
    if pgrep -f "Craft-Agent.*AppImage" >/dev/null 2>&1; then
        info "Stopping Craft Agent..."
        pkill -f "Craft-Agent.*AppImage" 2>/dev/null || true
        sleep 2
    fi

    # Create directories
    mkdir -p "$APP_DIR"
    mkdir -p "$INSTALL_DIR"

    # Remove existing AppImage
    [ -f "$APPIMAGE_INSTALL_PATH" ] && rm -f "$APPIMAGE_INSTALL_PATH"

    # Install AppImage
    info "Installing AppImage to $APP_DIR..."
    mv "$appimage_path" "$APPIMAGE_INSTALL_PATH"
    chmod +x "$APPIMAGE_INSTALL_PATH"

    # Create wrapper script
    info "Creating launcher at $WRAPPER_PATH..."
    cat > "$WRAPPER_PATH" << 'WRAPPER_EOF'
#!/bin/bash
# Craft Agent launcher - handles Linux-specific AppImage issues

APPIMAGE_PATH="$HOME/.craft-agent/app/Craft-Agent-x64.AppImage"
ELECTRON_CACHE="$HOME/.config/@craft-agent"
ELECTRON_CACHE_ALT="$HOME/.cache/@craft-agent"

# Verify AppImage exists
if [ ! -f "$APPIMAGE_PATH" ]; then
    echo "Error: Craft Agent not found at $APPIMAGE_PATH"
    echo "Reinstall: curl -fsSL https://agents.craft.do/install-app.sh | bash"
    exit 1
fi

# Ensure DISPLAY is set (required for X11)
if [ -z "$DISPLAY" ]; then
    export DISPLAY=:0.0
fi

# Clear stale cache referencing AppImage mount paths
# AppImage creates a new /tmp/.mount_Craft-XXXX each launch, so any cached path is stale
for cache_dir in "$ELECTRON_CACHE" "$ELECTRON_CACHE_ALT"; do
    if [ -d "$cache_dir" ] && grep -rq '/tmp/\.mount_Craft' "$cache_dir" 2>/dev/null; then
        rm -rf "$cache_dir"
    fi
done

# Set APPIMAGE for auto-update
export APPIMAGE="$APPIMAGE_PATH"

# Launch with --no-sandbox (AppImage extracts to /tmp, losing SUID on chrome-sandbox)
exec "$APPIMAGE_PATH" --no-sandbox "$@"
WRAPPER_EOF

    chmod +x "$WRAPPER_PATH"

    # Migrate old installation
    OLD_APPIMAGE="$INSTALL_DIR/Craft-Agent-x64.AppImage"
    [ -f "$OLD_APPIMAGE" ] && rm -f "$OLD_APPIMAGE"

    echo ""
    echo "─────────────────────────────────────────────────────────────────────────"
    echo ""
    success "Installation complete!"
    echo ""
    printf "%b\n" "  AppImage: ${BOLD}$APPIMAGE_INSTALL_PATH${NC}"
    printf "%b\n" "  Launcher: ${BOLD}$WRAPPER_PATH${NC}"
    echo ""
    printf "%b\n" "  Run with: ${BOLD}craft-agents${NC}"
    echo ""
    printf "%b\n" "  Add to PATH if needed:"
    printf "%b\n" "    ${BOLD}echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc${NC}"
    echo ""

    # FUSE check
    if ! command -v fusermount >/dev/null 2>&1; then
        warn "FUSE required but not detected."
        printf "%b\n" "  Install: ${BOLD}sudo apt install fuse libfuse2${NC} (Debian/Ubuntu)"
        printf "%b\n" "           ${BOLD}sudo dnf install fuse fuse-libs${NC} (Fedora)"
    fi
fi
