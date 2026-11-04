#!/bin/sh
# Restaura un respaldo (BORRA los datos actuales). Uso:  ./scripts/restore.sh backups/ARCHIVO.sql.gz
set -eu
cd "$(dirname "$0")/.."
[ $# -eq 1 ] && [ -f "$1" ] || { echo "Uso: $0 backups/ARCHIVO.sql.gz"; exit 1; }
printf "Esto reemplaza la base de datos actual. Escribe RESTAURAR para continuar: "
read -r CONFIRM
[ "$CONFIRM" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }
docker compose stop backend frontend nginx
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\"" -c "CREATE DATABASE \"$POSTGRES_DB\" OWNER \"$POSTGRES_USER\""'
gunzip -c "$1" | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose start backend frontend nginx
echo "Base restaurada desde $1"
