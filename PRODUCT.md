# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + React + Tailwind CSS en el frontend; Node.js + Express + TypeScript con Prisma en el backend; PostgreSQL 16; Docker Compose + Nginx para el despliegue. Terminal emulada con Xterm.js y arrastrar y soltar con dnd-kit. Elegido por el usuario (backend Node.js, desarrollo desde cero).

## Users

- **Colaborador general** (administración, finanzas, operaciones, comercial de DS Intelligence): hace retos diarios de 3 a 5 minutos en la Ruta Corporativa para reconocer phishing e ingeniería social, y revisa su escudo, racha y XP.
- **Analista técnico / TI**: además resuelve la Ruta Técnica (orden de volatilidad forense y terminal emulada con `sha256sum`, `grep`, `cat`, `whois`).
- **Administrador / SecOps**: da de alta y edita reactivos sin tocar código y consulta métricas y el mapa de calor por departamento.
- Piloto previsto: 10 a 20 colaboradores (60 % no técnico, 40 % técnico).

## Product Purpose

Plataforma web gamificada de microaprendizaje y simulación para fortalecer las competencias de ciberseguridad del personal de DS Intelligence, sustituyendo la capacitación pasiva (lecturas y videos, con baja retención) por retos cortos con retroalimentación inmediata y medición objetiva. Es el proyecto de Residencias Profesionales (ITTLA Campus Oriente, 500 horas, 20 semanas) de Alejandro David Hernández Hernández. El éxito se mide con Δ% en detección de phishing, MTTD humano, adherencia a rachas (≥4 días) y puntuación SUS superior a 80.

## Positioning

Entrena con simulaciones prácticas dentro del navegador (bandeja de correo con banderas arrastrables, terminal forense emulada, ordenamiento de cadena de custodia según RFC 3227 / ISO 27037) y entrega a la empresa métricas de vulnerabilidad humana por departamento, sin exponer datos reales ni ejecutar nada en el servidor.

## Operating Context

- Uso diario en sesiones de 3 a 5 minutos, de escritorio o móvil (360 a 1920 px), dentro de la intranet de DS Intelligence.
- Despliegue con Docker Compose en servidores Linux (Debian/Ubuntu) de la empresa.
- Entorno académico: la memoria técnica y el documento preliminar se entregan al ITTLA. El Documento Preeliminar no se empieza hasta terminar la plataforma.

## Capabilities and Constraints

- Dos rutas: Corporativa (10 retos de phishing y 5 de decisión rápida) y Técnica (2 de cadena de custodia y 3 de terminal): 20 retos en el MVP.
- Gamificación: escudo de 5 capas (cada fallo resta 20 %; en 0 hay bloqueo de 2 minutos con píldora teórica), rachas con multiplicador (1.2× a 7 días, 1.5× a 30 días) y XP (10, 25 o 50 según dificultad). Rangos: Recluta, Centinela, Defensor, Especialista SOC, Guardián Forense.
- Roles: COLABORADOR, ANALISTA y SECOPS, con control de acceso por rol; sesiones con JWT.
- Restricción NDA: solo datos sintéticos o anonimizados; nada real de DS Intelligence en el sistema ni en las capturas.
- La terminal nunca ejecuta comandos en el host; los reactivos nunca exponen la solución al cliente.
- Las métricas son colectivas por departamento: sin listas punitivas individuales.
- Idioma de la interfaz: español (México); los términos técnicos (phishing, hash, IoC) se conservan.
- Decididas en Notion: 20 retos del MVP, 4 pantallas clave (Hub, Simulador de phishing, Terminal web, Dashboard administrativo).

## Brand Commitments

Sin logo ni guía de marca de DS Intelligence: el proyecto usa identidad propia (nombre del proyecto, gamificación de ciberseguridad). El logo `[DS-LOGO]` de los wireframes es solo un marcador. Los tokens visuales de la Semana 1-4 son un punto de partida documentado, no un compromiso de marca confirmado.

## Evidence on Hand

- Documentación en Notion (Residencias Profesionales → Avances): propuesta técnica, SRS IEEE 830, esquema de BD, catálogo de endpoints, cronograma y protocolo del piloto.
- No hay código, contenido de retos terminado, usuarios reales, resultados del piloto ni testimonios. No inventar métricas, clientes ni resultados.

## Product Principles

1. Aprender haciendo: cada reto simula una decisión real y responde en el momento con una explicación, no con un reproche.
2. Sesiones breves: nada debe pedir más de 3 a 5 minutos ni interferir con el trabajo.
3. Seguridad de la plataforma primero: aislar la terminal, no filtrar soluciones y no usar datos reales.
4. Mejora colectiva: medir el riesgo por departamento y proteger la privacidad de cada persona.
5. Alcance cerrado: el MVP son 20 retos; cualquier cosa más se hace desde el panel de administración, no con código.

## Accessibility & Inclusion

WCAG 2.1 nivel AA (contraste y navegación por teclado), diseño responsivo de 360 a 1920 px. El arrastrar y soltar del simulador de phishing debe tener una alternativa de teclado y de lector de pantalla.
