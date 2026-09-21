#!/bin/sh
set -e

mkdir -p /app/certs

# Option A — paste PEM into env (never commit)
if [ -n "${DB_SSL_CA_PEM:-}" ]; then
  printf '%s\n' "$DB_SSL_CA_PEM" | sed 's/\\n/\n/g' > /app/certs/aiven-ca.pem
  export DB_SSL_CA=/app/certs/aiven-ca.pem
fi

# Option B — Render Secret File (mounted at /etc/secrets/<filename>)
# Prefer an existing DB_SSL_CA path; otherwise discover common locations.
if [ -n "${DB_SSL_CA:-}" ] && [ -f "${DB_SSL_CA}" ]; then
  :
elif [ -f /etc/secrets/aiven-ca.pem ]; then
  export DB_SSL_CA=/etc/secrets/aiven-ca.pem
elif [ -f /app/certs/aiven-ca.pem ]; then
  export DB_SSL_CA=/app/certs/aiven-ca.pem
fi

mode="$(printf '%s' "${DB_SSLMODE:-require}" | tr '[:upper:]' '[:lower:]')"
needs_ca=0
case "$mode" in
  verify-ca|verify-full) needs_ca=1 ;;
esac

if [ -n "${DB_SSL_CA:-}" ] && [ -f "${DB_SSL_CA}" ]; then
  echo "db_ssl_ca=$DB_SSL_CA"
elif [ "$needs_ca" = "1" ]; then
  echo "ERROR: DB_SSLMODE=$mode needs a CA file." >&2
  echo "  Neon: use DB_SSLMODE=require and leave DB_SSL_CA empty." >&2
  echo "  Aiven: upload CA PEM and set DB_SSL_CA=/etc/secrets/aiven-ca.pem" >&2
  echo "  Or set DB_SSL_CA_PEM with the certificate contents." >&2
  exit 1
else
  echo "db_sslmode=$mode (no CA file — ok for Neon require)"
fi

# Log DB host only (no credentials) to debug NXDOMAIN / wrong URL
_db_url="${DATABASE_URL:-}"
if [ -n "$_db_url" ]; then
  _db_host="$(
    printf '%s' "$_db_url" \
      | sed -E 's#^[a-zA-Z0-9+.-]+://[^@/]+@##' \
      | sed -E 's#/.*##' \
      | sed -E 's#:.*##'
  )"
  echo "db_host=${_db_host:-unknown}"
elif [ -n "${DB_HOST:-}" ]; then
  echo "db_host=$DB_HOST"
fi

exec "$@"
