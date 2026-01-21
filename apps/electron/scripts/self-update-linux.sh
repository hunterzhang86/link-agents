#!/bin/bash
set -euo pipefail

NEW_APPIMAGE="${1:-}"
CURRENT_APPIMAGE="${2:-}"

if [ -z "$NEW_APPIMAGE" ] || [ -z "$CURRENT_APPIMAGE" ]; then
  echo "Usage: self-update-linux.sh <new-appimage> <current-appimage>"
  exit 1
fi

if [ ! -f "$NEW_APPIMAGE" ]; then
  echo "ERROR: New AppImage not found at $NEW_APPIMAGE"
  exit 1
fi

if [ ! -f "$CURRENT_APPIMAGE" ]; then
  echo "ERROR: Current AppImage not found at $CURRENT_APPIMAGE"
  exit 1
fi

chmod +x "$NEW_APPIMAGE"

TARGET_DIR="$(dirname "$CURRENT_APPIMAGE")"
TEMP_APPIMAGE="$CURRENT_APPIMAGE.new"
BACKUP_APPIMAGE="$CURRENT_APPIMAGE.bak"

cp "$NEW_APPIMAGE" "$TEMP_APPIMAGE"
chmod +x "$TEMP_APPIMAGE"

if [ -f "$CURRENT_APPIMAGE" ]; then
  mv "$CURRENT_APPIMAGE" "$BACKUP_APPIMAGE"
fi

mv "$TEMP_APPIMAGE" "$CURRENT_APPIMAGE"
rm -f "$BACKUP_APPIMAGE" >/dev/null 2>&1 || true

nohup "$CURRENT_APPIMAGE" >/dev/null 2>&1 &
