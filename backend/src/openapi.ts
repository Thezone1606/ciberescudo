const secured = [{ bearerAuth: [] }];
const unauthorized = { "401": { description: "Token ausente, inválido o expirado" } };

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "API de la plataforma gamificada de ciberseguridad",
    version: "1.1.0",
    description: "DS Intelligence. Residencias Profesionales ITTLA Campus Oriente.",
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
  },
  paths: {
    "/health": {
      get: { summary: "Estado del servicio", responses: { "200": { description: "OK" } } },
    },
    "/auth/login": {
      post: {
        summary: "Inicia sesión y emite access (15 min) y refresh (7 días)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: { email: { type: "string", format: "email" }, password: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "Tokens y perfil" }, "400": { description: "Cuerpo inválido" }, "401": { description: "Credenciales incorrectas" } },
      },
    },
    "/auth/refresh": {
      post: {
        summary: "Renueva el par de tokens con un refresh token vigente",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } },
            },
          },
        },
        responses: { "200": { description: "Nuevo par de tokens" }, "401": { description: "Refresh inválido, expirado o revocado" } },
      },
    },
    "/auth/logout": {
      post: { summary: "Cierra sesión y revoca los refresh tokens", security: secured, responses: { "204": { description: "Sesión cerrada" }, ...unauthorized } },
    },
    "/auth/me": {
      get: { summary: "Perfil activo: rol, XP, racha y escudo", security: secured, responses: { "200": { description: "Perfil" }, ...unauthorized } },
    },
    "/categories": {
      get: { summary: "Catálogo de categorías", security: secured, responses: { "200": { description: "Lista de categorías" }, ...unauthorized } },
    },
    "/challenges": {
      get: {
        summary: "Lista de retos activos (sin solución)",
        security: secured,
        parameters: [{ name: "track", in: "query", schema: { type: "string", enum: ["AWARENESS", "TECHNICAL"] } }],
        responses: { "200": { description: "Retos de la ruta pedida" }, "400": { description: "Parámetro inválido" }, ...unauthorized },
      },
    },
    "/challenges/{id}": {
      get: {
        summary: "Detalle de un reto (sin solución)",
        security: secured,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Reto" }, "404": { description: "No existe" }, ...unauthorized },
      },
    },
    "/admin/ping": {
      get: { summary: "Comprobación de acceso de administración (SECOPS)", security: secured, responses: { "200": { description: "OK" }, "403": { description: "Rol insuficiente" }, ...unauthorized } },
    },
  },
};

Object.assign(openapi.paths, {
  "/challenges/{id}/attempt": {
    post: {
      summary: "Envía la respuesta a un reto: evalúa, aplica escudo, racha y XP, y guarda el intento",
      description:
        "La forma de `response` depende del tipo de reto. phishing: {identified_indicators: string[], action?: 'report_incident'|'mark_safe'}. " +
        "quick: {choice}. custody: {order: string[]}. terminal: {verdict: 'CONFIRMED'|'FALSE_POSITIVE'}. " +
        "Cada fallo resta 20 al escudo; en 0 hay 2 minutos de enfriamiento (423). El XP solo se otorga la primera vez que se acierta un reto.",
      security: secured,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["time_taken_seconds", "response"],
              properties: {
                time_taken_seconds: { type: "integer", minimum: 0, maximum: 3600 },
                response: { type: "object" },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Resultado: is_successful, xp_awarded, current_xp, current_streak, shield_integrity, cooldown_until, feedback, explanation_guide" },
        "400": { description: "Respuesta o tiempo con formato inválido" },
        "404": { description: "Reto inexistente o desactivado" },
        "423": { description: "Escudo agotado: incluye cooldown_until y retry_after_seconds" },
        ...unauthorized,
      },
    },
  },
  "/metrics/leaderboard": {
    get: {
      summary: "Ranking colaborativo por departamento (solo agregados, sin personas)",
      security: secured,
      responses: { "200": { description: "rank, department, members, totalXp, averageXp" }, ...unauthorized },
    },
  },
});

const adminResponses = { "401": { description: "Sin sesión" }, "403": { description: "Requiere rol SECOPS" } };
const filterParams = [
  { name: "from", in: "query", schema: { type: "string", example: "2026-11-01" }, description: "Fecha inicial (AAAA-MM-DD), inclusive" },
  { name: "to", in: "query", schema: { type: "string", example: "2026-11-30" }, description: "Fecha final (AAAA-MM-DD), inclusive" },
  { name: "departmentId", in: "query", schema: { type: "string", format: "uuid" } },
  { name: "categoryId", in: "query", schema: { type: "string", format: "uuid" } },
  { name: "track", in: "query", schema: { type: "string", enum: ["AWARENESS", "TECHNICAL"] } },
];

Object.assign(openapi.paths, {
  "/admin/challenges": {
    get: {
      summary: "Lista de retos para administración (incluye retirados, intentos y tasa de fallo)",
      security: secured,
      parameters: [
        { name: "track", in: "query", schema: { type: "string", enum: ["AWARENESS", "TECHNICAL"] } },
        { name: "active", in: "query", schema: { type: "string", enum: ["true", "false"] } },
      ],
      responses: { "200": { description: "Retos" }, ...adminResponses },
    },
    post: {
      summary: "Crea un reto",
      description: "El cuerpo usa la forma legible `content` según su tipo (phishing, quick, custody, terminal). El servidor valida, genera la solución y baraja la cadena de custodia.",
      security: secured,
      responses: { "201": { description: "Reto creado" }, "400": { description: "Errores de validación con `issues[].path` y `message` en español" }, ...adminResponses },
    },
  },
  "/admin/challenges/{id}": {
    get: { summary: "Un reto en la forma editable (incluye la solución)", security: secured, responses: { "200": { description: "Reto" }, "404": { description: "No existe" }, ...adminResponses } },
    put: { summary: "Actualiza un reto", security: secured, responses: { "200": { description: "Reto actualizado" }, "400": { description: "Validación" }, "404": { description: "No existe" }, ...adminResponses } },
  },
  "/admin/challenges/{id}/active": {
    patch: { summary: "Retira o reactiva un reto (no se borran: los intentos históricos lo referencian)", security: secured, responses: { "200": { description: "Reto" }, ...adminResponses } },
  },
  "/admin/filters": { get: { summary: "Departamentos y categorías para los filtros del tablero", security: secured, responses: { "200": { description: "Opciones" }, ...adminResponses } } },
  "/admin/metrics/overview": {
    get: {
      summary: "Indicadores: adopción de 7 días, racha vigente ≥7 días, MTTD humano, escudo promedio y tasa de fallo",
      security: secured,
      parameters: filterParams,
      responses: { "200": { description: "Indicadores" }, "400": { description: "Filtros inválidos" }, ...adminResponses },
    },
  },
  "/admin/metrics/heatmap": {
    get: {
      summary: "Mapa de calor departamento × categoría (verde <10 %, amarillo 10-25 %, rojo >25 % de fallo)",
      description: "Una celda con menos de 5 intentos no calcula la tasa (`level: insufficient`) para no señalar a personas.",
      security: secured,
      parameters: filterParams,
      responses: { "200": { description: "Matriz" }, "400": { description: "Filtros inválidos" }, ...adminResponses },
    },
  },
  "/admin/export": {
    get: {
      summary: "Reporte de cumplimiento agregado en CSV o JSON (sin datos de personas)",
      security: secured,
      parameters: [{ name: "format", in: "query", schema: { type: "string", enum: ["csv", "json"], default: "json" } }, ...filterParams],
      responses: { "200": { description: "Archivo descargable" }, "400": { description: "Parámetros inválidos" }, ...adminResponses },
    },
  },
});

Object.assign(openapi.paths, {
  "/auth/password": {
    post: {
      summary: "Cambia la contraseña (mínimo 12 caracteres) y cierra todas las sesiones",
      security: secured,
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["currentPassword", "newPassword"], properties: { currentPassword: { type: "string" }, newPassword: { type: "string", minLength: 12 } } } } } },
      responses: { "204": { description: "Contraseña cambiada; hay que iniciar sesión de nuevo" }, "400": { description: "Contraseña actual incorrecta o nueva no válida" }, ...unauthorized },
    },
  },
  "/pilot/status": { get: { summary: "Fase del piloto y qué le falta a esta persona (diagnóstico, SUS)", security: secured, responses: { "200": { description: "Estado" }, ...unauthorized } } },
  "/pilot/diagnostic": {
    get: { summary: "Siguiente reto del diagnóstico sin contestar (solo el enunciado)", security: secured, responses: { "200": { description: "Reto o `item: null` si ya terminó" }, "409": { description: "El diagnóstico no está abierto" }, ...unauthorized } },
  },
  "/pilot/diagnostic/{id}": {
    post: {
      summary: "Registra una respuesta de diagnóstico: sin retroalimentación y sin afectar XP, escudo ni racha",
      security: secured,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: { "201": { description: "Registrada" }, "400": { description: "Respuesta mal formada" }, "404": { description: "No es un reto de diagnóstico" }, "409": { description: "Fase cerrada o ya contestado" }, ...unauthorized },
    },
  },
  "/pilot/sus": {
    get: { summary: "Afirmaciones del cuestionario SUS y si está disponible", security: secured, responses: { "200": { description: "Estado" }, ...unauthorized } },
    post: { summary: "Envía las 10 respuestas del SUS (1 a 5); una por persona", security: secured, responses: { "201": { description: "Registrado" }, "400": { description: "Respuestas inválidas" }, "409": { description: "No disponible o ya contestado" }, ...unauthorized } },
  },
  "/admin/pilot": { get: { summary: "Fase del piloto y avance (participantes, diagnósticos completados, SUS)", security: secured, responses: { "200": { description: "Estado" }, ...adminResponses } } },
  "/admin/pilot/phase": { put: { summary: "Cambia la fase: OFF, BASELINE, PRACTICE, POSTTEST o CLOSED", security: secured, responses: { "200": { description: "Estado" }, "400": { description: "Fase inválida" }, "409": { description: "Sin retos de diagnóstico activos" }, ...adminResponses } } },
  "/admin/pilot/report": {
    get: {
      summary: "Reporte del piloto: variación en la detección, falsos positivos, tiempo de detección, adherencia y SUS",
      description: "Solo agregados. Las comparaciones usan únicamente a quienes completaron el diagnóstico inicial y el final.",
      security: secured,
      parameters: [{ name: "format", in: "query", schema: { type: "string", enum: ["csv", "json"], default: "json" } }],
      responses: { "200": { description: "Archivo descargable" }, "400": { description: "Formato inválido" }, ...adminResponses },
    },
  },
  "/admin/users": {
    get: {
      summary: "Usuarios con su avance. «Nuevos» = sin primer inicio de sesión; «existentes» = ya entraron",
      security: secured,
      parameters: [
        { name: "status", in: "query", schema: { type: "string", enum: ["new", "existing"] } },
        { name: "department", in: "query", schema: { type: "string", format: "uuid" } },
        { name: "search", in: "query", schema: { type: "string", maxLength: 100 } },
      ],
      responses: { "200": { description: "Usuarios y totales de retos" }, "400": { description: "Filtro inválido" }, ...adminResponses },
    },
  },
  "/admin/users/invite": {
    post: { summary: "Invita personas: crea las cuentas con contraseña inicial aleatoria (se devuelve una sola vez). Acepta `people` o `csv`", security: secured, responses: { "201": { description: "Resultado por persona: creada o ya existía" }, "400": { description: "Datos inválidos: no se crea ninguna cuenta" }, ...adminResponses } },
  },
  "/admin/users/{id}": {
    patch: { summary: "Edita nombre, departamento, rol o estado (activo/inactivo). Desactivar cierra sus sesiones", security: secured, responses: { "200": { description: "Usuario actualizado" }, "400": { description: "Datos inválidos" }, "404": { description: "No existe" }, "409": { description: "Un administrador no puede quitarse su propio acceso" }, ...adminResponses } },
  },
  "/admin/users/{id}/reset-password": {
    post: { summary: "Genera una contraseña nueva (se devuelve una sola vez) y cierra todas las sesiones", security: secured, responses: { "200": { description: "Contraseña generada" }, "404": { description: "No existe" }, ...adminResponses } },
  },
});
