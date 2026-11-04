# CiberEscudo

Plataforma web gamificada de microaprendizaje y simulación en ciberseguridad para DS Intelligence
(Residencias Profesionales, ITTLA Campus Oriente). Todo el contenido es sintético.

| Capa | Tecnología |
| --- | --- |
| Interfaz | Next.js 16 (React 19) + Tailwind CSS, xterm.js, dnd-kit |
| API | Node.js 22 + Express + TypeScript, Prisma, Zod, JWT |
| Datos | PostgreSQL 16 |
| Borde | Nginx (TLS 1.3, cabeceras de seguridad, límite de peticiones) |

```
backend/    API, esquema y migraciones de Prisma, seed de los 20 retos
frontend/   interfaz web, BFF de sesión (/api/session/*) y pruebas E2E
infra/      docker-compose, Nginx, certificados y scripts de operación
```

## Desarrollo local

Requisitos: Node.js 22 o superior y PostgreSQL 16.

```bash
# Backend (http://localhost:4000)
cd backend
cp .env.example .env            # revisa DATABASE_URL y los secretos
npm install
npx prisma migrate deploy
npm run db:seed                 # catálogos, 20 retos y usuarios de prueba
npm run dev

# Frontend (http://localhost:3000), en otra terminal
cd frontend
echo "BACKEND_URL=http://localhost:4000" > .env.local
npm install
npm run dev
```

Pruebas: `npm test` en `backend/` (usa la base real y corre archivo por archivo) y en `frontend/`;
`npm run e2e` en `frontend/` ejecuta el flujo completo con Microsoft Edge y limpia lo que crea.
Esa prueba reinicia el progreso del usuario de prueba, por lo que solo se usa con la base de desarrollo.

## Despliegue con Docker

Requisitos: Docker Engine con Compose v2, en un servidor Linux (Debian/Ubuntu).

```bash
cd infra
cp .env.example .env
# Edita .env: SERVER_NAME, POSTGRES_PASSWORD, JWT_ACCESS_SECRET y JWT_REFRESH_SECRET.
#   openssl rand -hex 24      → contraseña de la base (solo letras y números)
#   openssl rand -base64 48   → cada secreto JWT (deben ser distintos)
docker compose up -d --build
docker compose ps             # todos deben quedar en "healthy"
```

El primer arranque aplica las migraciones y carga los catálogos y los 20 retos. No crea usuarios.
Crea el primer administrador (la contraseña se pide sin eco, mínimo 12 caracteres):

```bash
./scripts/create-admin.sh
```

Después entra a `https://SERVER_NAME` y abre **Administración**. Desde ahí se dan de alta los retos nuevos.

### Certificados

La primera vez se genera un certificado **autofirmado** (los navegadores mostrarán una advertencia).
Para producción coloca el de la CA de la empresa en `infra/certs/` como `fullchain.pem` y `privkey.pem`
antes de `docker compose up`: si existen, no se genera ninguno. Para renovarlo, reemplaza los archivos y
ejecuta `docker compose restart nginx`.

### Variables (`infra/.env`)

| Variable | Qué hace |
| --- | --- |
| `SERVER_NAME` | Nombre con el que se accede; debe coincidir con el certificado. |
| `HTTP_PORT`, `HTTPS_PORT` | Puertos publicados (80 y 443 por defecto). |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Base de datos. La contraseña es obligatoria. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Firma de sesiones. Obligatorias y distintas; la API no arranca con valores de ejemplo. |
| `SEED_DEMO_USERS`, `SEED_PASSWORD` | Solo para pruebas: crea colaborador, analista y SecOps de demostración. |

### Operación

Verificado con Docker Desktop 4.97 (Engine 29, Compose 5): las cuatro imágenes compilan, los servicios quedan `healthy`,
los datos sobreviven a `docker compose down` y los respaldos se restauran. Las imágenes pesan ~760 MB (API), ~400 MB (web) y ~74 MB (Nginx).

```bash
docker compose logs -f backend          # registros
docker compose pull && docker compose up -d --build   # actualizar
./scripts/backup.sh                     # respaldo en infra/backups/ (comprimido)
./scripts/restore.sh backups/ARCHIVO.sql.gz           # restaurar (pide confirmación)
```

Programa `backup.sh` con cron (por ejemplo, a diario) y copia `infra/backups/` fuera del servidor.
Las migraciones se aplican solas al arrancar el backend. Haz un respaldo antes de actualizar.

### Qué protege esta configuración

- **Solo Nginx está expuesto.** La base de datos, el backend y el frontend viven en redes internas
  sin salida a internet; la base solo la alcanza el backend.
- **TLS 1.3**, HSTS, `Content-Security-Policy`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` y `Permissions-Policy`.
  La CSP permite estilos y scripts en línea por Next.js y xterm.js; endurecerla con *nonces* es una mejora futura.
- **Límite de peticiones por IP**, con el inicio de sesión a 5 por minuto.
- **Backend, frontend y Nginx sin root**, con el sistema de archivos de solo lectura. Todos los servicios
  llevan `no-new-privileges` y sin capacidades de Linux (Postgres conserva las 5 que necesita para su arranque).
- **Sesiones**: el token de renovación va en una cookie `httpOnly` + `Secure` + `SameSite=Lax`; el de acceso solo vive
  en memoria y dura 15 minutos. Contraseñas con argon2id.
- **Sin documentación de la API expuesta** (`/docs` devuelve 404) y sin usuarios de demostración por defecto.
- La API se niega a arrancar si los secretos JWT son los de ejemplo o son iguales entre sí.

### Problemas frecuentes

- *La redirección de HTTP a HTTPS pierde el puerto*: solo ocurre si cambias `HTTPS_PORT`; con 80/443 es correcta. Con otros puertos entra directo a `https://SERVER_NAME:PUERTO`.
- *Los scripts de `infra/scripts` son de shell*: en Windows ejecútalos desde Git Bash o WSL.
- *«define POSTGRES_PASSWORD en infra/.env»*: falta completar un valor obligatorio.
- *No inicia sesión por HTTP*: la cookie de sesión es `Secure`; usa siempre `https://`.
- *La base no conecta tras cambiar la contraseña*: Postgres solo lee `POSTGRES_PASSWORD` al crear el volumen.
  Cámbiala con `ALTER USER` o recrea el volumen (`docker compose down -v` borra los datos).

## Piloto

El piloto mide cuánto mejora la detección de phishing con la práctica. Se maneja desde **Administración → Piloto**.

**1. Alta de participantes.** Prepara un CSV con las columnas `correo, nombre, departamento, rol` (rol `COLABORADOR` o `ANALISTA`; vacío = `COLABORADOR`):

```bash
# Desarrollo (desde backend/)
npm run pilot:users -- participantes.csv > credenciales.csv
# Docker (desde infra/)
./scripts/import-participants.sh participantes.csv credenciales.csv
```

Si cualquier línea tiene un error no se crea ninguna cuenta. Las contraseñas iniciales salen solo en la hoja de credenciales: entrégalas por un canal seguro y bórrala. `--reset` restablece la contraseña de cuentas que ya existen. Cada persona puede cambiarla en el menú de su cuenta.

**2. Fases.** Avanza en orden desde la pestaña Piloto: *Diagnóstico inicial* (la práctica queda bloqueada hasta terminarlo) → *Práctica* → *Evaluación final* (diagnóstico de nuevo + cuestionario SUS) → *Cerrado*. El diagnóstico son 8 correos distintos de los de práctica (6 maliciosos y 2 legítimos), sin retroalimentación ni efecto en XP, escudo o racha.

**3. Resultados.** La pestaña muestra la variación de detección, falsos positivos y tiempo medio de detección (solo quienes hicieron ambos diagnósticos), la adherencia (4 o más días seguidos practicando) y el SUS (meta: promedio mayor a 80). Se exportan en CSV o JSON, siempre agregados, sin datos individuales.

**4. Prueba de carga.** Con la API compilada corriendo (`npm run build && npm start` en `backend/`): `npm run loadtest -- --connections 30 --duration 15`. Crea cuentas temporales, mide latencia contra la meta de 300 ms (p97.5) y las borra.

> Las pruebas del backend con base de datos borran los intentos de diagnóstico de forma global: córrelas solo contra la base de desarrollo, no con un piloto en curso.
