#!/usr/bin/env bash
# Vercel Root Directory = frontend/storefront
# Ensures Linux native bindings for Tailwind v4 (@tailwindcss/oxide) + lightningcss.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_NM="$APP_DIR/node_modules"

echo "repo root: $ROOT"
echo "app dir:   $APP_DIR"
cd "$ROOT"

npm install --include=optional --include=dev --foreground-scripts

ensure_native_pkg() {
  local pkg="$1"   # e.g. lightningcss-linux-x64-gnu@1.32.0 or @tailwindcss/oxide-linux-x64-gnu@4.3.2
  local name="$2"  # directory / package name without version

  echo "→ ensuring $name"

  npm install -w storefront "$pkg" --no-save --foreground-scripts || true
  npm install "$pkg" --no-save --foreground-scripts || true

  local found=""
  # Prefer an already-installed copy under the monorepo
  found="$(find "$ROOT/node_modules" "$APP_NM" -type d -path "*/${name}" 2>/dev/null | head -1 || true)"

  if [ -z "$found" ]; then
    echo "  packing $pkg from registry…"
    local tmp
    tmp="$(mktemp -d)"
    (
      cd "$tmp"
      npm pack "$pkg"
      tar -xzf ./*.tgz
    )
    found="$tmp/package"
  fi

  if [ ! -d "$found" ]; then
    echo "ERROR: could not obtain $name" >&2
    exit 1
  fi

  # Place where Node will resolve it from the app's nested modules
  local dest_parent="$APP_NM"
  case "$name" in
    @*/*)
      local scope="${name%%/*}"
      dest_parent="$APP_NM/$scope"
      mkdir -p "$dest_parent"
      ;;
    *)
      mkdir -p "$APP_NM"
      ;;
  esac

  local dest="$APP_NM/$name"
  rm -rf "$dest"
  mkdir -p "$(dirname "$dest")"
  cp -R "$found" "$dest"
  echo "  installed → $dest"
}

# Versions must match lockfile / installed Tailwind
ensure_native_pkg "lightningcss-linux-x64-gnu@1.32.0" "lightningcss-linux-x64-gnu"
ensure_native_pkg "@tailwindcss/oxide-linux-x64-gnu@4.3.2" "@tailwindcss/oxide-linux-x64-gnu"

# lightningcss fallback: also drop .node next to the package
if [ -d "$APP_NM/lightningcss" ]; then
  NODE_FILE="$(find "$APP_NM/lightningcss-linux-x64-gnu" -name 'lightningcss.linux-x64-gnu.node' 2>/dev/null | head -1 || true)"
  if [ -n "${NODE_FILE:-}" ]; then
    cp "$NODE_FILE" "$APP_NM/lightningcss/lightningcss.linux-x64-gnu.node"
  fi
fi

echo "Verifying natives…"
cd "$APP_DIR"
node -e "require('lightningcss'); console.log('lightningcss OK')"
node -e "require('@tailwindcss/oxide'); console.log('oxide OK')"
echo "vercel-install complete"
