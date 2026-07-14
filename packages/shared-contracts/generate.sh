#!/usr/bin/env bash
# Generate TypeScript clients from each running service's OpenAPI schema.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="${ROOT}/packages/shared-contracts/generated"
BASE_URL="${FRUITSHOP_API_BASE:-http://localhost}"

SERVICES=(
  auth-service
  catalog-service
  inventory-service
  order-service
  payment-service
  delivery-service
  coupon-service
  review-service
  notification-service
  cms-service
  search-service
  storefront-bff
  admin-bff
)

if ! command -v npx >/dev/null 2>&1; then
  echo "error: npx is required (install Node.js)" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

failed=0
for service in "${SERVICES[@]}"; do
  url="${BASE_URL}/api/${service}/openapi.json"
  out="${OUT_DIR}/${service}.ts"
  echo "→ ${service}: ${url}"
  if ! npx --yes openapi-typescript "${url}" -o "${out}"; then
    echo "  failed to generate ${service}" >&2
    failed=1
  else
    echo "  wrote ${out}"
  fi
done

if [[ "${failed}" -ne 0 ]]; then
  echo "One or more services failed. Are they up? Try: make dev" >&2
  exit 1
fi

echo "Done. Clients are in ${OUT_DIR}"
