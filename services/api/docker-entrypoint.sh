#!/bin/sh
set -e

mkdir -p /app/certs

mode="$(printf '%s' "${DB_SSLMODE:-require}" | tr '[:upper:]' '[:lower:]')"
needs_ca=0
case "$mode" in
  verify-ca|verify-full) needs_ca=1 ;;
esac

# CA material only for verify-ca / verify-full (e.g. Aiven).
# Neon + sslmode=require must NOT load an old Aiven CA — that causes
# SSLCertVerificationError: unable to get local issuer certificate.
if [ "$needs_ca" = "1" ]; then
  # Option A — paste PEM into env (never commit)
  if [ -n "${DB_SSL_CA_PEM:-}" ]; then
    printf '%s\n' "$DB_SSL_CA_PEM" | sed 's/\\n/\n/g' > /app/certs/aiven-ca.pem
    export DB_SSL_CA=/app/certs/aiven-ca.pem
  fi

  # Option B — Render Secret File
  if [ -n "${DB_SSL_CA:-}" ] && [ -f "${DB_SSL_CA}" ]; then
    :
  elif [ -f /etc/secrets/aiven-ca.pem ]; then
    export DB_SSL_CA=/etc/secrets/aiven-ca.pem
  elif [ -f /app/certs/aiven-ca.pem ]; then
    export DB_SSL_CA=/app/certs/aiven-ca.pem
  fi

  if [ -n "${DB_SSL_CA:-}" ] && [ -f "${DB_SSL_CA}" ]; then
    echo "db_ssl_ca=$DB_SSL_CA"
  else
    echo "ERROR: DB_SSLMODE=$mode needs a CA file." >&2
    echo "  Neon: use DB_SSLMODE=require and leave DB_SSL_CA / DB_SSL_CA_PEM empty." >&2
    echo "  Aiven: upload CA PEM and set DB_SSL_CA=/etc/secrets/aiven-ca.pem" >&2
    exit 1
  fi
else
  unset DB_SSL_CA || true
  echo "db_sslmode=$mode (encrypt only, no CA verify — ok for Neon)"
fi

# Log DB host only (no credentials)
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
