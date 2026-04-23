#!/usr/bin/env bash
# Generate self-signed SSL cert for docker-compose Postgres service.
# Produces db-ssl/server.crt and db-ssl/server.key (both gitignored).
# Re-run if certs expire (10-year default).

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)/db-ssl"
mkdir -p "$DIR"

if [[ -f "$DIR/server.crt" && -f "$DIR/server.key" ]]; then
  echo "Certs already exist at $DIR/server.{crt,key} — delete them first if you want to regenerate."
  exit 0
fi

openssl req -new -x509 -days 3650 -nodes \
  -subj "/CN=gymquest-postgres" \
  -out "$DIR/server.crt" \
  -keyout "$DIR/server.key"

chmod 600 "$DIR/server.key"

echo "Generated self-signed cert:"
openssl x509 -in "$DIR/server.crt" -noout -subject -dates
