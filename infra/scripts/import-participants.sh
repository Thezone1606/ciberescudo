#!/bin/sh
# Alta masiva de participantes del piloto. Lee un CSV (correo, nombre, departamento, rol) y escribe la hoja de
# credenciales en otro archivo. Uso (desde infra/):  ./scripts/import-participants.sh participantes.csv credenciales.csv
# Entrega las contraseñas por un canal seguro y borra la hoja de credenciales después.
set -eu
cd "$(dirname "$0")/.."
[ $# -eq 2 ] || { echo "Uso: $0 participantes.csv credenciales.csv" >&2; exit 2; }
[ ! -e "$2" ] || { echo "$2 ya existe; no se sobrescribe." >&2; exit 2; }
umask 077
docker compose exec -T backend node dist/scripts/pilot-users.js < "$1" > "$2"
