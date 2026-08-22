#!/usr/bin/env bash
# Generate TypeScript client from the running API OpenAPI schema.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="${ROOT}/packages/shared-contracts/generated"
BASE_URL="${FRUITSHOP_API_BASE:-http://localhost:8000}"
URL="${BASE_URL}/openapi.json"
OUT="${OUT_DIR}/fruit-shop-api.ts"

if ! command -v npx >/dev/null 2>&1; then
  echo "error: npx is required (install Node.js)" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

echo "→ ${URL}"
npx --yes openapi-typescript "${URL}" -o "${OUT}"
echo "Done. Client written to ${OUT}"
