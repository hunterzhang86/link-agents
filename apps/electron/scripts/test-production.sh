#!/bin/bash
set -euo pipefail

# Script to test Electron app in production mode locally
# This builds the app with electron-builder --dir to simulate packaged app structure

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ELECTRON_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$ELECTRON_DIR")")"

echo "=== Testing Electron app in production mode ==="
echo ""

# 1. Prepare packaging assets (copy SDK and interceptor)
echo "Step 1: Preparing packaging assets..."
bash "$SCRIPT_DIR/prepare-packaging.sh"

# 2. Build the app
echo ""
echo "Step 2: Building Electron app..."
cd "$ROOT_DIR"
bun run electron:build

# 3. Build with electron-builder --dir (creates unpacked app structure)
echo ""
echo "Step 3: Creating production-like app structure..."
cd "$ELECTRON_DIR"

# Detect platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="mac"
    ARCH="arm64"
    if [[ $(uname -m) == "x86_64" ]]; then
        ARCH="x64"
    fi
    # electron-builder --dir creates mac-arm64 or mac-x64 directories
    APP_PATH="$ELECTRON_DIR/release/mac-${ARCH}/Link Agents.app"
    EXECUTABLE="$APP_PATH/Contents/MacOS/Link Agents"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
    ARCH="x64"
    APP_PATH="$ELECTRON_DIR/release/linux-unpacked"
    EXECUTABLE="$APP_PATH/link-agents"
else
    echo "ERROR: Unsupported platform: $OSTYPE"
    exit 1
fi

# Build with --dir flag (creates unpacked directory instead of installer)
export npm_config_package_manager=npm
npx electron-builder --${PLATFORM} --${ARCH} --dir

# 4. Verify the app was built
if [ ! -d "$APP_PATH" ]; then
    echo "ERROR: App not found at $APP_PATH"
    echo "Contents of release directory:"
    ls -la "$ELECTRON_DIR/release/"
    exit 1
fi

echo ""
echo "=== Build Complete ==="
echo "App location: $APP_PATH"
echo ""

# 5. Show how to run it
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "To test the app, run:"
    echo "  open \"$APP_PATH\""
    echo ""
    echo "Or from command line:"
    echo "  \"$EXECUTABLE\""
    echo ""
    echo "To view logs:"
    echo "  tail -f ~/Library/Logs/Link\\ Agents/main.log"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "To test the app, run:"
    echo "  \"$EXECUTABLE\""
    echo ""
    echo "To view logs:"
    echo "  tail -f ~/.config/Link\\ Agents/logs/main.log"
fi

echo ""
echo "Note: This app will run in production mode (app.isPackaged = true)"
echo "      All production-specific code paths will be tested."
