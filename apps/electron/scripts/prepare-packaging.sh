#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ELECTRON_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$ELECTRON_DIR")")"

SDK_SOURCE="$ROOT_DIR/node_modules/@anthropic-ai/claude-agent-sdk"
SDK_DEST="$ELECTRON_DIR/node_modules/@anthropic-ai/claude-agent-sdk"

INTERCEPTOR_SOURCE="$ROOT_DIR/packages/shared/src/network-interceptor.ts"
INTERCEPTOR_DEST="$ELECTRON_DIR/packages/shared/src/network-interceptor.ts"

if [ ! -d "$SDK_SOURCE" ]; then
  echo "ERROR: SDK not found at $SDK_SOURCE"
  echo "Run 'bun install' from the repository root first."
  exit 1
fi

mkdir -p "$(dirname "$SDK_DEST")"
rm -rf "$SDK_DEST"
cp -R "$SDK_SOURCE" "$SDK_DEST"

if [ ! -f "$INTERCEPTOR_SOURCE" ]; then
  echo "ERROR: Interceptor not found at $INTERCEPTOR_SOURCE"
  exit 1
fi

mkdir -p "$(dirname "$INTERCEPTOR_DEST")"
cp "$INTERCEPTOR_SOURCE" "$INTERCEPTOR_DEST"

echo "Prepared Electron packaging assets."
