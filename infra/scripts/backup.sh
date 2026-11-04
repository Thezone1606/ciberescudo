#!/bin/sh
# Respaldo de la base de datos en infra/backups/ciberescudo-AAAAMMDD-HHMMSS.sql.gz
# Uso (desde infra/):  ./scripts/backup.sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p backups
FILE="backups/ciberescudo-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' | gzip > "$FILE"
echo "Respaldo guardado en $FILE"
