#!/bin/sh
# Crea (o restablece la contraseña de) una cuenta de administración. La contraseña se pide sin eco
# y no queda en el historial ni en la lista de procesos. Uso (desde infra/):  ./scripts/create-admin.sh
set -eu
cd "$(dirname "$0")/.."
printf "Correo del administrador: "; read -r ADMIN_EMAIL
printf "Nombre completo: "; read -r ADMIN_NAME
printf "Contraseña (de 8 a 12 caracteres): "; stty -echo; read -r ADMIN_PASSWORD; stty echo; printf "\n"
export ADMIN_EMAIL ADMIN_NAME ADMIN_PASSWORD
docker compose exec -e ADMIN_EMAIL -e ADMIN_NAME -e ADMIN_PASSWORD backend node dist/scripts/create-admin.js
