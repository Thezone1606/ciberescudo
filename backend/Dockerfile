# syntax=docker/dockerfile:1
# API de CiberEscudo. Imagen mínima, sin herramientas de desarrollo y sin ejecutarse como root.
FROM node:22-bookworm-slim AS base
# Prisma necesita OpenSSL en tiempo de ejecución.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --- Compilación: dependencias completas + TypeScript ---
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts
RUN npx prisma generate && npm run build

# --- Dependencias de producción (incluye el CLI de Prisma para las migraciones) ---
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate

# --- Imagen final ---
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    HOME=/tmp
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY prisma ./prisma
COPY docker-entrypoint.sh ./
RUN chmod 0555 docker-entrypoint.sh
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]
