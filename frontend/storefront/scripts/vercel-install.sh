#!/usr/bin/env bash
# Used by Vercel (see vercel.json). Ensures lightningcss Linux native binding exists.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

npm install --include=optional --include=dev --foreground-scripts

# Force the Linux binding into the storefront tree (Vercel builders are linux-x64)
npm install -w storefront lightningcss-linux-x64-gnu@1.32.0 --no-save --foreground-scripts || true
npm install lightningcss-linux-x64-gnu@1.32.0 --no-save --foreground-scripts || true

# Fallback: put package next to nested lightningcss AND copy .node into lightningcss/
STORE_NM="$ROOT/frontend/storefront/node_modules"
mkdir -p "$STORE_NM"

find_pkg() {
  find "$ROOT/node_modules" "$STORE_NM" -type d -name 'lightningcss-linux-x64-gnu' 2>/dev/null | head -1
}

PKG="$(find_pkg || true)"
if [ -z "${PKG:-}" ]; then
  echo "ERROR: lightningcss-linux-x64-gnu not installed" >&2
  ls -la "$ROOT/node_modules" | head -50 >&2 || true
  exit 1
fi

echo "Found native package at: $PKG"
rm -rf "$STORE_NM/lightningcss-linux-x64-gnu"
cp -R "$PKG" "$STORE_NM/lightningcss-linux-x64-gnu"

NODE_FILE="$(find "$PKG" -name 'lightningcss.linux-x64-gnu.node' | head -1 || true)"
if [ -n "${NODE_FILE:-}" ] && [ -d "$STORE_NM/lightningcss" ]; then
  cp "$NODE_FILE" "$STORE_NM/lightningcss/lightningcss.linux-x64-gnu.node"
  echo "Copied $NODE_FILE -> $STORE_NM/lightningcss/"
fi

# Sanity check
node -e "require('$STORE_NM/lightningcss'); console.log('lightningcss native OK')"
