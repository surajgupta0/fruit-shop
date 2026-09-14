#!/usr/bin/env bash
# Vercel Root Directory = frontend/storefront → this script lives in scripts/
# Monorepo root is three levels up from scripts/: scripts → storefront → frontend → repo
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
STORE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STORE_NM="$STORE_DIR/node_modules"

echo "repo root: $ROOT"
echo "storefront: $STORE_DIR"
cd "$ROOT"

npm install --include=optional --include=dev --foreground-scripts

# Install Linux native binding (Vercel builders are linux-x64)
npm install -w storefront lightningcss-linux-x64-gnu@1.32.0 --no-save --foreground-scripts || true
npm install lightningcss-linux-x64-gnu@1.32.0 --no-save --foreground-scripts || true

mkdir -p "$STORE_NM"

find_pkg() {
  find "$ROOT/node_modules" "$STORE_NM" \
    -type d -name 'lightningcss-linux-x64-gnu' 2>/dev/null | head -1
}

PKG="$(find_pkg || true)"

# Last resort: download tarball from npm registry
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
  ls -la "$ROOT/node_modules" 2>&1 | head -40 >&2 || true
  exit 1
fi

echo "Found native package at: $PKG"
rm -rf "$STORE_NM/lightningcss-linux-x64-gnu"
cp -R "$PKG" "$STORE_NM/lightningcss-linux-x64-gnu"

NODE_FILE="$(find "$PKG" -name 'lightningcss.linux-x64-gnu.node' | head -1 || true)"
if [ -n "${NODE_FILE:-}" ] && [ -d "$STORE_NM/lightningcss" ]; then
  cp "$NODE_FILE" "$STORE_NM/lightningcss/lightningcss.linux-x64-gnu.node"
  echo "Copied native .node into lightningcss/"
fi

node -e "require('$STORE_NM/lightningcss'); console.log('lightningcss native OK')"
