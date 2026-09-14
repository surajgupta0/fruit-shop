#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

npm install --include=optional --include=dev --foreground-scripts
npm install -w admin lightningcss-linux-x64-gnu@1.32.0 --no-save --foreground-scripts || true
npm install lightningcss-linux-x64-gnu@1.32.0 --no-save --foreground-scripts || true

ADMIN_NM="$ROOT/frontend/admin/node_modules"
mkdir -p "$ADMIN_NM"

PKG="$(find "$ROOT/node_modules" "$ADMIN_NM" -type d -name 'lightningcss-linux-x64-gnu' 2>/dev/null | head -1 || true)"
if [ -z "${PKG:-}" ]; then
  echo "ERROR: lightningcss-linux-x64-gnu not installed" >&2
  exit 1
fi

rm -rf "$ADMIN_NM/lightningcss-linux-x64-gnu"
cp -R "$PKG" "$ADMIN_NM/lightningcss-linux-x64-gnu"

NODE_FILE="$(find "$PKG" -name 'lightningcss.linux-x64-gnu.node' | head -1 || true)"
if [ -n "${NODE_FILE:-}" ] && [ -d "$ADMIN_NM/lightningcss" ]; then
  cp "$NODE_FILE" "$ADMIN_NM/lightningcss/lightningcss.linux-x64-gnu.node"
fi

node -e "require('$ADMIN_NM/lightningcss'); console.log('lightningcss native OK')"
