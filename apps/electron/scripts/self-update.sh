#!/bin/bash
set -euo pipefail

DMG_PATH="${1:-}"
APP_PATH="${2:-}"

if [ -z "$DMG_PATH" ]; then
  echo "Usage: self-update.sh <dmg-path> [app-path]"
  exit 1
fi

if [ ! -f "$DMG_PATH" ]; then
  echo "ERROR: DMG not found at $DMG_PATH"
  exit 1
fi

TARGET_DIR="/Applications"
if [ -n "$APP_PATH" ] && [[ "$APP_PATH" == *".app/Contents/"* ]]; then
  APP_BUNDLE="${APP_PATH%%/Contents/*}"
  TARGET_DIR="$(dirname "$APP_BUNDLE")"
fi

MOUNT_DIR="$(hdiutil attach -nobrowse -readonly -noverify "$DMG_PATH" | awk '/Volumes/ {print $3; exit}')"
if [ -z "$MOUNT_DIR" ]; then
  echo "ERROR: Failed to mount DMG"
  exit 1
fi

APP_SOURCE="$(find "$MOUNT_DIR" -maxdepth 2 -name "*.app" -print -quit)"
if [ -z "$APP_SOURCE" ]; then
  echo "ERROR: No .app found in DMG"
  hdiutil detach "$MOUNT_DIR" >/dev/null 2>&1 || true
  exit 1
fi

APP_NAME="$(basename "$APP_SOURCE")"
TARGET_APP="$TARGET_DIR/$APP_NAME"
BACKUP_APP="${TARGET_APP}.backup"

if [ -d "$TARGET_APP" ]; then
  rm -rf "$BACKUP_APP"
  mv "$TARGET_APP" "$BACKUP_APP"
fi

if ! ditto "$APP_SOURCE" "$TARGET_APP"; then
  rm -rf "$TARGET_APP"
  if [ -d "$BACKUP_APP" ]; then
    mv "$BACKUP_APP" "$TARGET_APP"
  fi
  hdiutil detach "$MOUNT_DIR" >/dev/null 2>&1 || true
  exit 1
fi

rm -rf "$BACKUP_APP" >/dev/null 2>&1 || true
hdiutil detach "$MOUNT_DIR" >/dev/null 2>&1 || true

open "$TARGET_APP" >/dev/null 2>&1 || true
