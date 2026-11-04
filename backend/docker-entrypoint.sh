#!/bin/sh
# Arranque del contenedor: migra la base, carga los catálogos iniciales y levanta la API.
set -e

echo "Aplicando migraciones…"
node node_modules/prisma/build/index.js migrate deploy

# Idempotente: crea lo que falta (roles, departamentos, categorías, retos del MVP) sin tocar lo editado.
echo "Cargando catálogos iniciales…"
node dist/prisma/seed.js

echo "Iniciando la API…"
exec node dist/src/server.js
