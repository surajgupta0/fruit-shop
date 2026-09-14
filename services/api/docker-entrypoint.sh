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
  echo "  Render Secret File: upload aiven-ca.pem then set DB_SSL_CA=/etc/secrets/aiven-ca.pem" >&2
  echo "  Or set DB_SSL_CA_PEM with the certificate contents." >&2
  exit 1
fi

exec "$@"
