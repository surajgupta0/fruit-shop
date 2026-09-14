#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ADMIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ADMIN_NM="$ADMIN_DIR/node_modules"

echo "repo root: $ROOT"
echo "admin: $ADMIN_DIR"
cd "$ROOT"

npm install --include=optional --include=dev --foreground-scripts
npm install -w admin lightningcss-linux-x64-gnu@1.32.0 --no-save --foreground-scripts || true
npm install lightningcss-linux-x64-gnu@1.32.0 --no-save --foreground-scripts || true

mkdir -p "$ADMIN_NM"

find_pkg() {
  find "$ROOT/node_modules" "$ADMIN_NM" \
    -type d -name 'lightningcss-linux-x64-gnu' 2>/dev/null | head -1
}

PKG="$(find_pkg || true)"

if [ -z "${PKG:-}" ]; then
  echo "optional install missed; packing lightningcss-linux-x64-gnu from registry…"
  TMP="$(mktemp -d)"
  (
    cd "$TMP"
    npm pack lightningcss-linux-x64-gnu@1.32.0
    tar -xzf lightningcss-linux-x64-gnu-*.tgz
  )
  PKG="$TMP/package"
fi

if [ -z "${PKG:-}" ] || [ ! -d "$PKG" ]; then
  echo "ERROR: lightningcss-linux-x64-gnu not available" >&2
  exit 1
fi

echo "Found native package at: $PKG"
rm -rf "$ADMIN_NM/lightningcss-linux-x64-gnu"
cp -R "$PKG" "$ADMIN_NM/lightningcss-linux-x64-gnu"

NODE_FILE="$(find "$PKG" -name 'lightningcss.linux-x64-gnu.node' | head -1 || true)"
if [ -n "${NODE_FILE:-}" ] && [ -d "$ADMIN_NM/lightningcss" ]; then
  cp "$NODE_FILE" "$ADMIN_NM/lightningcss/lightningcss.linux-x64-gnu.node"
fi

node -e "require('$ADMIN_NM/lightningcss'); console.log('lightningcss native OK')"
